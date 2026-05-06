// Força o uso de DNS do Google e Cloudflare para resolver problemas de conexão
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config();
const app = require('./api/index');

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📍 http://localhost:${PORT}/api`);
  console.log(`📱 Acesse do celular: http://SEU_IP:${PORT}`);
});