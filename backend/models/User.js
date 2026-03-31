const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'franchise'], required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' } // Only applicable if franchise
});

module.exports = mongoose.model('User', userSchema);
