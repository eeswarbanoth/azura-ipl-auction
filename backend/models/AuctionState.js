const mongoose = require('mongoose');

// State singleton to track live auction context
const auctionStateSchema = new mongoose.Schema({
  currentPlayerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  queue: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  history: [
    {
      playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
      teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
      soldPrice: Number,
      timestamp: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('AuctionState', auctionStateSchema);
