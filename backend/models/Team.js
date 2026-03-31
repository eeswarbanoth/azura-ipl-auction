const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  username: { type: String, unique: true, sparse: true },
  totalPurse: { type: Number, required: true },
  remainingBudget: { type: Number, required: true },
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }]
}, { timestamps: true });

module.exports = mongoose.model('Team', teamSchema);
