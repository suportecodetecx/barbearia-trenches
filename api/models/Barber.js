const mongoose = require('mongoose');

const BarberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  photo: { type: String, default: 'images/avatar.png' },
  role: { type: String, default: 'BARBEIRO PROFISSIONAL' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Barber', BarberSchema);
