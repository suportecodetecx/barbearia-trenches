const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('./connect');
const User = require('./models/User');
const Booking = require('./models/Booking');
const Barber = require('./models/Barber');
const Setting = require('./models/Setting');
const Payment = require('./models/Payment');  // ← ADICIONE ESTA LINHA
const path = require('path');
const fs = require('fs');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ========== SISTEMA DE VALIDAÇÃO DE PAGAMENTO ==========
const LAST_PAYMENT_DATE = '2026-06-02T00:00:00.000Z'; // hoje // Pagamento 10/05 → Vence 10/06 
const PAYMENT_DUE_DAYS = 30;  // Vence em 30 dias
const GRACE_DAYS = 5;         // 5 dias de tolerância

// Arquivo para armazenar status do pagamento
const paymentFile = path.join(__dirname, 'payment-status.json');

// Função para inicializar ou ler status do pagamento
async function getPaymentStatus() {
    try {
        await ensureConnection();
        
        let lastPayment;
        const paymentDoc = await Payment.findOne();
        
        if (paymentDoc && paymentDoc.lastPaymentDate) {
            lastPayment = new Date(paymentDoc.lastPaymentDate);
        } else {
            lastPayment = new Date(LAST_PAYMENT_DATE);
        }
        
        lastPayment.setHours(0, 0, 0, 0);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const daysDiff = Math.floor((today - lastPayment) / (1000 * 60 * 60 * 24));
        
        const nextDue = new Date(lastPayment);
        nextDue.setDate(nextDue.getDate() + PAYMENT_DUE_DAYS);
        nextDue.setHours(23, 59, 59, 999);
        
        const isValid = daysDiff <= PAYMENT_DUE_DAYS;
        const daysOverdue = daysDiff - PAYMENT_DUE_DAYS;
        const graceDaysLeft = Math.max(0, GRACE_DAYS - (daysDiff - PAYMENT_DUE_DAYS));
        const isBlocked = !isValid && daysOverdue >= GRACE_DAYS;
        
        console.log(`📅 Status Pagamento:`, {
            lastPayment: lastPayment.toLocaleDateString('pt-BR'),
            hoje: today.toLocaleDateString('pt-BR'),
            daysDiff: daysDiff,
            isValid: isValid,
            daysOverdue: daysOverdue,
            graceDaysLeft: graceDaysLeft,
            isBlocked: isBlocked
        });
        
        return {
            isValid: isValid,
            daysOverdue: daysOverdue,
            graceDaysLeft: graceDaysLeft,
            lastPayment: lastPayment,
            nextDueDate: nextDue,
            isBlocked: isBlocked
        };
    } catch (error) {
        console.error('Erro ao buscar status:', error);
        return {
            isValid: true,
            daysOverdue: 0,
            graceDaysLeft: GRACE_DAYS,
            lastPayment: new Date(),
            nextDueDate: new Date(Date.now() + (PAYMENT_DUE_DAYS * 24 * 60 * 60 * 1000)),
            isBlocked: false
        };
    }
}
// Middleware de bloqueio do site por falta de pagamento
// Middleware de bloqueio do site por falta de pagamento
const paymentBlocker = async (req, res, next) => {
    // Rotas que NUNCA podem ser bloqueadas
    const publicRoutes = [
        '/api/verify-payment', 
        '/api/register-payment', 
        '/api/payment-status',
        '/payment-blocked.html',
        '/api/settings',
        '/api/barbers',
        '/api/bookings/all',
        '/api/bookings',
        '/api/login',
        '/api/register',
        '/admin.html',
        '/admin'
    ];
    
    // SEMPRE liberar rotas de API e rotas públicas
    if (publicRoutes.includes(req.path) || req.path.startsWith('/api/')) {
        return next();
    }
    
    const paymentStatus = await getPaymentStatus();
    
    // Só bloqueia se NÃO for API e estiver bloqueado
    if (!paymentStatus.isValid && paymentStatus.daysOverdue >= GRACE_DAYS) {
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Site Bloqueado - Pagamento Pendente</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Segoe UI', Arial, sans-serif;
                        background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
                        min-height: 100vh;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        padding: 20px;
                    }
                    .block-container {
                        background: rgba(0,0,0,0.95);
                        border-radius: 20px;
                        padding: 40px;
                        max-width: 550px;
                        text-align: center;
                        border: 3px solid #ff3333;
                        box-shadow: 0 0 50px rgba(255,0,0,0.3);
                        animation: pulse 2s infinite;
                    }
                    @keyframes pulse {
                        0%, 100% { box-shadow: 0 0 50px rgba(255,0,0,0.3); }
                        50% { box-shadow: 0 0 80px rgba(255,0,0,0.6); }
                    }
                    h1 { color: #ff3333; font-size: 48px; margin-bottom: 20px; }
                    .lock-icon { font-size: 80px; margin-bottom: 20px; }
                    p { color: #e0e0e0; font-size: 16px; margin: 15px 0; line-height: 1.6; }
                    .overdue-days { 
                        background: rgba(255,0,0,0.2); 
                        padding: 15px; 
                        border-radius: 10px;
                        color: #ff6666; 
                        font-size: 22px; 
                        font-weight: bold; 
                        margin: 20px 0;
                    }
                    .contact { 
                        background: rgba(255,170,0,0.1);
                        padding: 15px;
                        border-radius: 10px;
                        margin-top: 20px;
                    }
                    .contact p { color: #ffaa00; margin: 5px 0; }
                    hr { margin: 20px 0; border-color: #333; }
                    .small { font-size: 12px; color: #666; }
                    .block-date {
                        font-size: 14px;
                        color: #ff8888;
                        margin-top: 10px;
                    }
                </style>
            </head>
            <body>
                <div class="block-container">
                    <div class="lock-icon">🔒</div>
                    <h1>ACESSO BLOQUEADO</h1>
                    <p><strong style="color:#ffaa00;">BARBEARIA TRENCHES</strong></p>
                    <p>O acesso ao site foi temporariamente bloqueado devido à falta de pagamento da assinatura mensal.</p>
                    <div class="overdue-days">
                        ⚠️ Pagamento vencido há ${paymentStatus.daysOverdue} dias
                    </div>
                    <div class="contact">
                        <p>📞 <strong>(11) 94848-4457</strong></p>
                        <p>📧 <strong>suporte@barbeariatrenches.com</strong></p>
                    </div>
                    <hr>
                    <p class="small">Sistema de proteção de assinatura - CodeTecx</p>
                    <p class="block-date">Último pagamento: ${paymentStatus.lastPayment.toLocaleDateString('pt-BR')}</p>
                </div>
            </body>
            </html>
        `);
    }
    
    next();
};

// Aplicar o middleware de bloqueio
app.use(paymentBlocker);

// ========== API PARA VERIFICAR STATUS DO PAGAMENTO ==========
app.get('/api/payment-status', async (req, res) => {
    const status = await getPaymentStatus();
    res.json({
        success: true,
        isValid: status.isValid,
        daysOverdue: status.daysOverdue,
        graceDaysLeft: status.graceDaysLeft,
        lastPayment: status.lastPayment,
        nextDueDate: status.nextDueDate,
        isBlocked: !status.isValid && status.daysOverdue >= GRACE_DAYS
    });
});

// ========== API PARA REGISTRAR PAGAMENTO (ADMIN) ==========
app.post('/api/register-payment', async (req, res) => {
    try {
        const { adminKey, paymentDate } = req.body;
        
        // CHAVE SECRETA
        const SECRET_KEY = 'code@@';
        
        if (adminKey !== SECRET_KEY) {
            return res.status(403).json({ error: 'Chave de administrador inválida' });
        }
        
        // Conectar ao banco
        await ensureConnection();
        
        // Buscar ou criar documento de pagamento
        let paymentDoc = await Payment.findOne();
        
        const newPaymentDate = paymentDate ? new Date(paymentDate) : new Date();
        
        if (paymentDoc) {
            // Atualizar documento existente
            paymentDoc.lastPaymentDate = newPaymentDate;
            paymentDoc.lastUpdate = new Date();
            paymentDoc.registeredBy = 'admin';
            await paymentDoc.save();
        } else {
            // Criar novo documento
            paymentDoc = new Payment({
                lastPaymentDate: newPaymentDate,
                lastUpdate: new Date(),
                registeredBy: 'admin'
            });
            await paymentDoc.save();
        }
        
        console.log('✅ Pagamento registrado em:', newPaymentDate);
        
        // Atualizar a constante LAST_PAYMENT_DATE para o novo valor
        // (opcional: para usar em memória)
        
        res.json({ 
            success: true, 
            message: 'Pagamento registrado com sucesso! Site reativado por mais 30 dias.',
            nextDueDate: new Date(newPaymentDate.getTime() + (PAYMENT_DUE_DAYS * 24 * 60 * 60 * 1000))
        });
        
    } catch (error) {
        console.error('❌ Erro ao registrar pagamento:', error);
        res.status(500).json({ error: 'Erro interno ao registrar pagamento' });
    }
});

// ========== SERVIDOR DE ARQUIVOS ESTÁTICOS ==========
app.use(express.static(path.join(__dirname, '..')));

app.get('/', async (req, res) => {
    const paymentStatus = await getPaymentStatus();
    
    if (!paymentStatus.isValid && paymentStatus.graceDaysLeft > 0 && paymentStatus.graceDaysLeft <= 5) {
        res.sendFile(path.join(__dirname, '..', 'index.html'));
    } else {
        res.sendFile(path.join(__dirname, '..', 'index.html'));
    }
});

// ========== FUNÇÃO DE CONEXÃO ==========
async function ensureConnection() {
    try {
        await connectDB();
        return true;
    } catch (error) {
        console.error('Erro na conexão:', error);
        return false;
    }
}

// ============ CONFIGURAÇÕES GLOBAIS (MongoDB) ============

app.get('/api/settings', async (req, res) => {
    try {
        await ensureConnection();
        let settings = await Setting.findOne();
        if (!settings) {
            settings = new Setting({
                hours: {
                    mon: 'FECHADO',
                    tue: '09:00 - 20:00',
                    wed: '09:00 - 20:00',
                    thu: '09:00 - 21:00',
                    fri: '09:00 - 21:00',
                    sat: '09:00 - 18:00'
                },
                services: [
                    { name: 'Cabelo', price: 40, duration: 45, id: 'cabelo' },
                    { name: 'Barba', price: 40, duration: 30, id: 'barba' },
                    { name: 'Cabelo e Barba', price: 80, duration: 75, id: 'combo' },
                    { name: 'Pacote Trenches', price: 125, duration: 90, id: 'pacote' }
                ],
                phone: '(11) 94848-4457',
                instagram: '@barbeariatrenches',
                address: 'Av. Maj. Melo, 35\nVila Nova Aparecida\nMogi das Cruzes - SP',
                blockedDates: [],
                almoco: {
                    inicio: '12:00',
                    fim: '13:00',
                    dias: [2, 3, 4, 5, 6]
                }
            });
            await settings.save();
            console.log('📋 Configurações padrão criadas');
        }
        res.json(settings);
    } catch (error) {
        console.error('Erro ao buscar configurações:', error);
        res.status(500).json({ error: 'Erro ao buscar configurações' });
    }
});

app.post('/api/settings', async (req, res) => {
    try {
        await ensureConnection();
        const updates = req.body;
        
        let settings = await Setting.findOne();
        if (!settings) {
            settings = new Setting();
        }
        
        if (updates.hours) settings.hours = { ...settings.hours, ...updates.hours };
        if (updates.services) settings.services = updates.services;
        if (updates.phone) settings.phone = updates.phone;
        if (updates.instagram) settings.instagram = updates.instagram;
        if (updates.address) settings.address = updates.address;
        if (updates.blockedDates) settings.blockedDates = updates.blockedDates;
        if (updates.almoco) settings.almoco = updates.almoco;
        
        settings.updatedAt = Date.now();
        await settings.save();
        
        console.log('✅ Configurações salvas globalmente');
        res.json({ message: 'Configurações salvas com sucesso!', settings });
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        res.status(500).json({ error: 'Erro ao salvar configurações' });
    }
});

// ============ ROTAS DE BARBEIROS ============

app.get('/api/barbers', async (req, res) => {
    try {
        await ensureConnection();
        const barbers = await Barber.find().sort({ createdAt: -1 });
        res.json(barbers);
    } catch (error) {
        console.error('Erro ao buscar barbeiros:', error);
        res.status(500).json({ error: 'Erro ao buscar barbeiros' });
    }
});

app.get('/api/barbers/:id', async (req, res) => {
    try {
        await ensureConnection();
        const barber = await Barber.findById(req.params.id);
        if (!barber) return res.status(404).json({ error: 'Barbeiro não encontrado' });
        res.json(barber);
    } catch (error) {
        console.error('Erro ao buscar barbeiro:', error);
        res.status(500).json({ error: 'Erro ao buscar barbeiro' });
    }
});

app.post('/api/barbers', async (req, res) => {
    try {
        await ensureConnection();
        const { name, photo } = req.body;
        
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }
        
        const barber = new Barber({ 
            name: name.trim(), 
            photo: photo || 'images/avatar.png',
            role: 'BARBEIRO PROFISSIONAL'
        });
        await barber.save();
        
        res.json({ message: 'Barbeiro adicionado com sucesso!', barber });
    } catch (error) {
        console.error('Erro ao adicionar barbeiro:', error);
        res.status(500).json({ error: 'Erro ao adicionar barbeiro' });
    }
});

app.put('/api/barbers/:id', async (req, res) => {
    try {
        await ensureConnection();
        const { name, photo } = req.body;
        
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }
        
        const barber = await Barber.findByIdAndUpdate(
            req.params.id,
            { name: name.trim(), photo: photo || 'images/avatar.png', role: 'BARBEIRO PROFISSIONAL' },
            { new: true }
        );
        
        if (!barber) return res.status(404).json({ error: 'Barbeiro não encontrado' });
        res.json({ message: 'Barbeiro atualizado!', barber });
    } catch (error) {
        console.error('Erro ao atualizar barbeiro:', error);
        res.status(500).json({ error: 'Erro ao atualizar barbeiro' });
    }
});

app.delete('/api/barbers/:id', async (req, res) => {
    try {
        await ensureConnection();
        const barber = await Barber.findByIdAndDelete(req.params.id);
        if (!barber) return res.status(404).json({ error: 'Barbeiro não encontrado' });
        res.json({ message: 'Barbeiro removido com sucesso!' });
    } catch (error) {
        console.error('Erro ao remover barbeiro:', error);
        res.status(500).json({ error: 'Erro ao remover barbeiro' });
    }
});

// ============ ROTAS DE USUÁRIOS ============

app.post('/api/register', async (req, res) => {
    try {
        await ensureConnection();
        const { name, phone, password } = req.body;
        
        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return res.status(400).json({ error: 'Celular ja cadastrado' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, phone, password: hashedPassword });
        await user.save();
        
        res.json({ message: 'Cadastro realizado com sucesso!' });
    } catch (error) {
        console.error('Erro no cadastro:', error);
        res.status(500).json({ error: 'Erro ao cadastrar' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        await ensureConnection();
        const { phone, password } = req.body;
        
        const user = await User.findOne({ phone });
        if (!user) {
            return res.status(400).json({ error: 'Celular nao encontrado' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Senha incorreta' });
        }
        
        res.json({ 
            user: { 
                id: user._id, 
                name: user.name, 
                phone: user.phone,
                isAdmin: user.isAdmin 
            } 
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
});

app.post('/api/admin/reset-password', async (req, res) => {
    try {
        await ensureConnection();
        const { phone, newPassword } = req.body;
        
        if (!phone || !newPassword) {
            return res.status(400).json({ error: 'Telefone e nova senha sao obrigatorios' });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const user = await User.findOneAndUpdate(
            { phone: phone },
            { password: hashedPassword },
            { new: true }
        );
        
        if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' });
        
        res.json({ message: 'Senha resetada com sucesso!', user: { name: user.name, phone: user.phone, isAdmin: user.isAdmin } });
    } catch (error) {
        console.error('Erro ao resetar senha:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/update-phone', async (req, res) => {
    try {
        await ensureConnection();
        const { oldPhone, newPhone } = req.body;
        
        if (!oldPhone || !newPhone) {
            return res.status(400).json({ error: 'Telefones sao obrigatorios' });
        }
        
        const user = await User.findOneAndUpdate(
            { phone: oldPhone },
            { phone: newPhone },
            { new: true }
        );
        
        if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' });
        
        res.json({ message: 'Telefone atualizado com sucesso!', user: { name: user.name, phone: user.phone, isAdmin: user.isAdmin } });
    } catch (error) {
        console.error('Erro ao atualizar telefone:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ ROTAS DE RESERVAS ============

app.post('/api/booking', async (req, res) => {
    try {
        await ensureConnection();
        const { userId, userName, service, date, time } = req.body;
        
        const existingBooking = await Booking.findOne({ date, time });
        if (existingBooking) {
            return res.status(400).json({ error: 'Horario ja reservado' });
        }
        
        const booking = new Booking({ userId, userName, service, date, time });
        await booking.save();
        
        res.json({ message: 'Reserva confirmada!', booking });
    } catch (error) {
        console.error('Erro ao criar reserva:', error);
        res.status(500).json({ error: 'Erro ao fazer reserva' });
    }
});

app.get('/api/bookings/all', async (req, res) => {
    try {
        await ensureConnection();
        const bookings = await Booking.find().sort({ date: 1, time: 1 });
        res.json(bookings);
    } catch (error) {
        console.error('Erro ao buscar reservas:', error);
        res.status(500).json({ error: 'Erro ao buscar reservas' });
    }
});

app.get('/api/bookings/:phone', async (req, res) => {
    try {
        await ensureConnection();
        const bookings = await Booking.find({ userId: req.params.phone }).sort({ date: 1, time: 1 });
        res.json(bookings);
    } catch (error) {
        console.error('Erro ao buscar reservas:', error);
        res.status(500).json({ error: 'Erro ao buscar reservas' });
    }
});

app.post('/api/delete-booking', async (req, res) => {
    try {
        await ensureConnection();
        const { id, date, time, userId, userName } = req.body;
        
        let result = { deletedCount: 0 };
        
        if (id && mongoose.Types.ObjectId.isValid(id)) {
            result = await Booking.deleteOne({ _id: new mongoose.Types.ObjectId(id) });
        }
        
        if (result.deletedCount === 0 && date && time && userId) {
            result = await Booking.deleteOne({ date, time, userId });
        }
        
        if (result.deletedCount === 0 && date && time) {
            result = await Booking.deleteOne({ date, time });
        }
        
        if (result.deletedCount === 0 && userName && date && time) {
            result = await Booking.deleteOne({ userName, date, time });
        }
        
        if (result.deletedCount === 1) {
            return res.json({ success: true, message: 'Reserva deletada com sucesso!' });
        } else {
            return res.json({ success: false, message: 'Reserva não encontrada' });
        }
    } catch (error) {
        console.error('Erro ao deletar:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/delete-booking/:id', async (req, res) => {
    try {
        await ensureConnection();
        const { id } = req.params;
        
        let result;
        if (mongoose.Types.ObjectId.isValid(id)) {
            result = await Booking.deleteOne({ _id: new mongoose.Types.ObjectId(id) });
        } else {
            result = await Booking.deleteOne({ _id: id });
        }
        
        if (result.deletedCount === 1) {
            res.json({ success: true, message: 'Reserva deletada!' });
        } else {
            res.status(404).json({ success: false, message: 'Reserva não encontrada' });
        }
    } catch (error) {
        console.error('Erro:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/forgot-password', async (req, res) => {
    try {
        await ensureConnection();
        const { action, telefone, novaSenha } = req.body;
        
        if (action === 'find') {
            if (!telefone) {
                return res.status(400).json({ success: false, message: 'Telefone é obrigatório' });
            }
            
            let user = await User.findOne({ phone: telefone });
            if (!user) {
                const apenasNumeros = telefone.replace(/\D/g, '');
                user = await User.findOne({ phone: apenasNumeros });
            }
            
            if (user) {
                return res.json({ success: true, nome: user.name });
            } else {
                return res.status(404).json({ success: false, message: 'Nenhuma conta encontrada com este número' });
            }
        }
        
        if (action === 'reset') {
            if (!telefone || !novaSenha) {
                return res.status(400).json({ success: false, message: 'Telefone e nova senha são obrigatórios' });
            }
            
            if (novaSenha.length < 4) {
                return res.status(400).json({ success: false, message: 'A nova senha deve ter pelo menos 4 caracteres' });
            }
            
            let user = await User.findOne({ phone: telefone });
            if (!user) {
                const apenasNumeros = telefone.replace(/\D/g, '');
                user = await User.findOne({ phone: apenasNumeros });
            }
            
            if (!user) {
                return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
            }
            
            const hashedPassword = await bcrypt.hash(novaSenha, 10);
            user.password = hashedPassword;
            await user.save();
            
            return res.json({ success: true, message: 'Senha alterada com sucesso!' });
        }
        
        return res.status(400).json({ success: false, message: 'Ação inválida' });
    } catch (error) {
        console.error('Erro no forgot-password:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// ========== USUÁRIO MESTRE (DESENVOLVEDOR) ==========
async function createMasterUserIfNeeded() {
    try {
        await ensureConnection();
        const masterExists = await User.findOne({ phone: '11988568185' });
        if (!masterExists) {
            const hashedPassword = await bcrypt.hash('code@@', 10);
            const master = new User({
                name: 'Desenvolvedor CodeTecx',
                phone: '11988568185',
                password: hashedPassword,
                isAdmin: true,
                isMaster: true  // Flag especial para desenvolvedor
            });
            await master.save();
            console.log('👑 Usuário Mestre criado: 11988568185 / code@@');
        } else {
            // Atualizar para garantir que tem isMaster = true
            if (!masterExists.isMaster) {
                masterExists.isMaster = true;
                await masterExists.save();
                console.log('✅ Usuário Mestre atualizado com permissão especial');
            }
            console.log('👑 Usuário Mestre já existe');
        }
    } catch (error) {
        console.error('Erro ao criar usuário mestre:', error);
    }
}

async function createAdminIfNeeded() {
    try {
        await ensureConnection();
        const adminExists = await User.findOne({ phone: '11999999999' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const admin = new User({
                name: 'Administrador',
                phone: '11999999999',
                password: hashedPassword,
                isAdmin: true
            });
            await admin.save();
            console.log('👑 Admin criado: 11999999999 / admin123');
        } else {
            console.log('👑 Admin ja existe');
        }
    } catch (error) {
        console.error('Erro ao criar admin:', error);
    }
}

(async () => {
    await ensureConnection();
    await createAdminIfNeeded();
    await createMasterUserIfNeeded();  // <-- ADICIONE ESTA LINHA
    console.log('💰 Sistema de pagamento ativo | Último pagamento: 01/06/2026');
    console.log('📅 Dias de tolerância:', GRACE_DAYS);
})();

module.exports = app;