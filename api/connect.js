// Força o uso de DNS do Google e Cloudflare para resolver problemas de conexão
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI não configurada no .env');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    // Conecta ao MongoDB Atlas
    cached.promise = mongoose.connect(MONGODB_URI).then((mongoose) => {
      console.log('✅ Conectado ao MongoDB Atlas');
      return mongoose;
    }).catch((err) => {
      console.error('❌ Erro ao conectar ao MongoDB:', err.message);
      throw err;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectDB;