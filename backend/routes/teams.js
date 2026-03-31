const express = require('express');
const router  = express.Router();
const Team    = require('../models/Team');
const User    = require('../models/User');
const bcrypt  = require('bcryptjs');
const { auth, authAdmin } = require('../middleware/auth');

// @route GET /api/teams
router.get('/', auth, async (req, res) => {
  try {
    const teams = await Team.find().populate('players');
    res.json(teams);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route POST /api/teams
router.post('/', [auth, authAdmin], async (req, res) => {
  const { name, totalPurse, username, password } = req.body;
  try {
    // Guard: username required for franchise login
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required to create a team.' });
    }

    const team = new Team({
      name,
      username,
      totalPurse,
      remainingBudget: totalPurse,
      players: []
    });
    await team.save();

    const salt           = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    await User.create({
      username,
      password: hashedPassword,
      role: 'franchise',
      teamId: team._id
    });

    req.io.emit('teams_updated');
    res.status(201).json(team);
  } catch (err) {
    // Duplicate key (username already taken)
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Username already taken. Choose a different one.' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route PUT /api/teams/:id
router.put('/:id', [auth, authAdmin], async (req, res) => {
  const { name, totalPurse, username, password } = req.body;
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    // Update team name
    if (name) team.name = name;

    // Update purse — adjust remaining budget by the difference
    if (totalPurse && !isNaN(totalPurse)) {
      const diff = totalPurse - team.totalPurse;
      team.totalPurse        = totalPurse;
      team.remainingBudget   = Math.max(0, team.remainingBudget + diff);
    }

    // Only touch the user record if username or password was provided
    if (username || password) {
      let user = await User.findOne({ teamId: team._id });

      if (!user && username) {
        // No linked user yet — create one (only safe if we have a username)
        user = new User({ role: 'franchise', teamId: team._id, username });
      }

      if (user) {
        if (username) {
          user.username  = username;
          team.username  = username;
        }
        if (password) {
          const salt     = await bcrypt.genSalt(10);
          user.password  = await bcrypt.hash(password, salt);
        }
        await user.save();
      }
    }

    await team.save();
    req.io.emit('teams_updated');
    res.json(team);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Username already taken. Choose a different one.' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route DELETE /api/teams/:id
router.delete('/:id', [auth, authAdmin], async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (team) {
      await User.deleteMany({ teamId: team._id });
      await team.deleteOne();
    }
    req.io.emit('teams_updated');
    res.json({ message: 'Team removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
