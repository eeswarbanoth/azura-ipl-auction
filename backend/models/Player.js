const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['Marquee', 'Batsmen', 'Wicket Keepers', 'All Rounders', 'Bowlers', 'Uncapped'], 
    required: true 
  },
  basePrice: { type: Number, required: true },
  rating: { type: Number, min: 1, max: 100, required: true },
  status: { 
    type: String, 
    enum: ['unsold', 'sold'], 
    default: 'unsold' 
  },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  soldPrice: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Player', playerSchema);
