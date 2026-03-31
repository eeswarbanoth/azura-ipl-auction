const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const { auth, authAdmin } = require('../middleware/auth');

// @route GET /api/players
router.get('/', auth, async (req, res) => {
  try {
    const players = await Player.find().populate('teamId', 'name');
    res.json(players);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route POST /api/players/bulk
router.post('/bulk', [auth, authAdmin], async (req, res) => {
  try {
    const { players } = req.body;
    if (!Array.isArray(players) || players.length === 0) {
      return res.status(400).json({ message: 'players array is required' });
    }
    const inserted = await Player.insertMany(players, { ordered: false });
    req.io.emit('players_updated');
    res.status(201).json({ inserted: inserted.length, players: inserted });
  } catch (err) {
    console.error('Bulk Player Import Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route POST /api/players
router.post('/', [auth, authAdmin], async (req, res) => {
  try {
    const player = new Player(req.body);
    await player.save();

    // Notify clients about updated players
    req.io.emit('players_updated');

    res.status(201).json(player);
  } catch (err) {
    console.error('Player Creation Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route PUT /api/players/:id
router.put('/:id', [auth, authAdmin], async (req, res) => {
  try {
    // If updating a sold player backwards, might be a bit tricky, but basic update:
    const player = await Player.findByIdAndUpdate(req.params.id, req.body, { new: true });
    req.io.emit('players_updated');
    res.json(player);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route DELETE /api/players/:id
router.delete('/:id', [auth, authAdmin], async (req, res) => {
  try {
    await Player.findByIdAndDelete(req.params.id);
    req.io.emit('players_updated');
    res.json({ message: 'Player removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
