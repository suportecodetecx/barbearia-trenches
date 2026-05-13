const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
    hours: {
        mon: { type: String, default: 'FECHADO' },
        tue: { type: String, default: '09:00 - 20:00' },
        wed: { type: String, default: '09:00 - 20:00' },
        thu: { type: String, default: '09:00 - 21:00' },
        fri: { type: String, default: '09:00 - 21:00' },
        sat: { type: String, default: '09:00 - 18:00' }
    },
    services: [{
        name: String,
        price: Number,
        duration: Number,
        id: String
    }],
    phone: { type: String, default: '(11) 94848-4457' },
    instagram: { type: String, default: '@barbeariatrenches' },
    address: { type: String, default: 'Av. Maj. Melo, 35\nVila Nova Aparecida\nMogi das Cruzes - SP' },
    blockedDates: { type: [String], default: [] },
    almoco: {
        inicio: { type: String, default: '11:00' },
        fim: { type: String, default: '12:00' },
        dias: { type: [Number], default: [2, 3, 4, 5, 6] }
    },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Setting', SettingSchema);