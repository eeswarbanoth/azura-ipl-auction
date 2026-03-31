const express = require('express');
const router = express.Router();
const AuctionState = require('../models/AuctionState');
const Player = require('../models/Player');
const Team = require('../models/Team');
const { auth, authAdmin } = require('../middleware/auth');

// Helper to get or create basic state
const getAuctionState = async () => {
  let state = await AuctionState.findOne();
  if (!state) {
    state = new AuctionState({ queue: [], history: [] });
    await state.save();
  }
  return state;
};

// @route GET /api/auction/state
router.get('/state', auth, async (req, res) => {
  try {
    const state = await getAuctionState();
    await state.populate(['currentPlayerId', 'queue', 'history.playerId', 'history.teamId']);
    res.json(state);
  } catch (err) {
    console.error('Error fetching state:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route POST /api/auction/set-current
// Set from queue to current player
router.post('/set-current', [auth, authAdmin], async (req, res) => {
  try {
    const { playerId } = req.body;
    const state = await getAuctionState();
    state.currentPlayerId = playerId;
    
    // Remove from queue
    state.queue = state.queue.filter(id => id.toString() !== playerId);
    
    await state.save();
    
    const populatedState = await AuctionState.findById(state._id)
      .populate('currentPlayerId queue');
      
    req.io.emit('auction_state_updated', populatedState);
    res.json(state);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route POST /api/auction/sell
router.post('/sell', [auth, authAdmin], async (req, res) => {
  try {
    const { teamId, soldPrice } = req.body;
    const state = await getAuctionState();

    if (!state.currentPlayerId) {
      return res.status(400).json({ message: 'No current player selected' });
    }

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    if (team.remainingBudget < soldPrice) {
      return res.status(400).json({ message: 'Insufficient budget!' });
    }

    // Process sale
    team.remainingBudget -= soldPrice;
    team.players.push(state.currentPlayerId);
    await team.save();

    const player = await Player.findById(state.currentPlayerId);
    player.status = 'sold';
    player.teamId = team._id;
    player.soldPrice = soldPrice;
    await player.save();

    state.history.push({
      playerId: player._id,
      teamId: team._id,
      soldPrice
    });
    
    // Store last sold info before clearing currentPlayerId, to display explicitly
    const broadcastSoldPayload = {
      player,
      team,
      soldPrice
    };

    state.currentPlayerId = null;
    await state.save();

    // Trigger fireworks and sound on client
    req.io.emit('player_sold', broadcastSoldPayload);
    
    const populatedState = await AuctionState.findById(state._id)
      .populate(['currentPlayerId', 'queue', 'history.playerId', 'history.teamId']);
    req.io.emit('auction_state_updated', populatedState);
    req.io.emit('teams_updated');
    req.io.emit('players_updated');

    res.json(populatedState);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route POST /api/auction/unsold
router.post('/unsold', [auth, authAdmin], async (req, res) => {
  try {
    const state = await getAuctionState();

    if (!state.currentPlayerId) {
      return res.status(400).json({ message: 'No current player selected' });
    }

    const player = await Player.findById(state.currentPlayerId);
    if(player) {
      player.status = 'unsold';
      await player.save();
    }

    const broadcastUnsoldPayload = { player };
    state.currentPlayerId = null;
    await state.save();

    req.io.emit('player_unsold', broadcastUnsoldPayload);

    const populatedState = await AuctionState.findById(state._id)
      .populate(['currentPlayerId', 'queue', 'history.playerId', 'history.teamId']);
      
    req.io.emit('auction_state_updated', populatedState);
    req.io.emit('players_updated');

    res.json(populatedState);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route POST /api/auction/queue
// Overwrite queue ordering
router.post('/queue', [auth, authAdmin], async (req, res) => {
  try {
    const { queue } = req.body; // Array of Player IDs
    const state = await getAuctionState();
    state.queue = queue;
    await state.save();

    const populatedState = await AuctionState.findById(state._id)
      .populate('currentPlayerId queue');
      
    req.io.emit('auction_state_updated', populatedState);
    res.json(state);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route POST /api/auction/correct-sale
router.post('/correct-sale', [auth, authAdmin], async (req, res) => {
  try {
    const { playerId, newTeamId, newPrice, action } = req.body; // action: 'update' | 'release'
    const player = await Player.findById(playerId);
    if (!player) return res.status(404).json({ message: 'Player not found' });

    const state = await getAuctionState();

    // 1. REVERSE OLD SALE (if any)
    if (player.status === 'sold' && player.teamId) {
      const oldTeam = await Team.findById(player.teamId);
      if (oldTeam) {
        oldTeam.remainingBudget += player.soldPrice;
        oldTeam.players = oldTeam.players.filter(id => id.toString() !== playerId);
        await oldTeam.save();
      }
      // Remove from history
      state.history = state.history.filter(h => h.playerId?.toString() !== playerId);
    }

    // 2. APPLY NEW SALE or MARK UNSOLD
    if (action === 'update' && newTeamId) {
      const newTeam = await Team.findById(newTeamId);
      if (!newTeam) return res.status(404).json({ message: 'New team not found' });
      
      if (newTeam.remainingBudget < newPrice) {
        return res.status(400).json({ message: 'New team has insufficient budget!' });
      }

      newTeam.remainingBudget -= newPrice;
      newTeam.players.push(player._id);
      await newTeam.save();

      player.status = 'sold';
      player.teamId = newTeam._id;
      player.soldPrice = newPrice;
      
      state.history.push({
        playerId: player._id,
        teamId: newTeam._id,
        soldPrice: newPrice
      });
    } else {
      // Release or no new team provided
      player.status = 'unsold';
      player.teamId = null;
      player.soldPrice = 0;
    }

    await player.save();
    await state.save();

    // Broadcast updates
    req.io.emit('teams_updated');
    req.io.emit('players_updated');
    const populatedState = await AuctionState.findById(state._id)
      .populate(['currentPlayerId', 'queue', 'history.playerId', 'history.teamId']);
    req.io.emit('auction_state_updated', populatedState);

    res.json({ message: 'Sale corrected successfully', player, state: populatedState });
  } catch (err) {
    console.error('Correction Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
