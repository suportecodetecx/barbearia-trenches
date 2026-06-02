const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    lastPaymentDate: { type: Date, required: true },
    lastUpdate: { type: Date, default: Date.now },
    registeredBy: { type: String }
});

module.exports = mongoose.model('Payment', PaymentSchema);