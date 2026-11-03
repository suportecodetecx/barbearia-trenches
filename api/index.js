const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('./connect');
const path = require('path');
const fs = require('fs');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ========== MODELOS (DEFINIDOS DIRETAMENTE) ==========

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    isMaster: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const BookingSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    service: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const Booking = mongoose.models.Booking || mongoose.model('Booking', BookingSchema);

const BarberSchema = new mongoose.Schema({
    name: { type: String, required: true },
    photo: { type: String, default: 'images/avatar.png' },
    role: { type: String, default: 'BARBEIRO PROFISSIONAL' },
    createdAt: { type: Date, default: Date.now }
});
const Barber = mongoose.models.Barber || mongoose.model('Barber', BarberSchema);

const SettingSchema = new mongoose.Schema({
    hours: { type: Object, default: {} },
    services: { type: Array, default: [] },
    phone: { type: String, default: '' },
    instagram: { type: String, default: '' },
    address: { type: String, default: '' },
    blockedDates: { type: Array, default: [] },
    almoco: { type: Object, default: {} },
    updatedAt: { type: Date, default: Date.now }
});
const Setting = mongoose.models.Setting || mongoose.model('Setting', SettingSchema);

const PaymentSchema = new mongoose.Schema({
    lastPaymentDate: { type: Date, required: true },
    lastUpdate: { type: Date, default: Date.now },
    registeredBy: { type: String, default: 'admin' }
});
const Payment = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);

// ========== SISTEMA DE VALIDAÇÃO DE PAGAMENTO ==========
const LAST_PAYMENT_DATE = '2026-06-01T00:00:00.000Z';
const PAYMENT_DUE_DAY = 1;

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

        const yearDue = lastPayment.getFullYear();
        const monthDue = lastPayment.getMonth() + 1;
        const nextDue = new Date(yearDue, monthDue, PAYMENT_DUE_DAY, 0, 0, 0, 0);

        const isBlocked = today.getTime() > nextDue.getTime();
        const daysDiff = Math.floor((today - lastPayment) / (1000 * 60 * 60 * 24));
        const daysOverdue = isBlocked ? Math.floor((today - nextDue) / (1000 * 60 * 60 * 24)) : 0;

        console.log('📅 Status Pagamento:', {
            lastPayment: lastPayment.toLocaleDateString('pt-BR'),
            hoje: today.toLocaleDateString('pt-BR'),
            proximoVencimento: nextDue.toLocaleDateString('pt-BR'),
            isBlocked: isBlocked
        });

        return {
            isValid: !isBlocked,
            daysOverdue: daysOverdue,
            graceDaysLeft: 0,
            lastPayment: lastPayment,
            nextDueDate: nextDue,
            isBlocked: isBlocked
        };
    } catch (error) {
        console.error('Erro ao buscar status:', error);
        return { isValid: true, daysOverdue: 0, graceDaysLeft: 0, lastPayment: new Date(), nextDueDate: new Date(), isBlocked: false };
    }
}

function renderBlockedHTML(paymentStatus) {
    return `<!DOCTYPE html>
    <html><head><meta charset="UTF-8"><title>Site Bloqueado</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%); min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; margin: 0; }
    .block-container { background: rgba(0,0,0,0.95); border-radius: 20px; padding: 40px; max-width: 550px; text-align: center; border: 3px solid #ff3333; box-shadow: 0 0 50px rgba(255,0,0,0.3); animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { box-shadow: 0 0 50px rgba(255,0,0,0.3); } 50% { box-shadow: 0 0 80px rgba(255,0,0,0.6); } }
    h1 { color: #ff3333; font-size: 48px; margin-bottom: 20px; } .lock-icon { font-size: 80px; margin-bottom: 20px; }
    p { color: #e0e0e0; font-size: 16px; margin: 15px 0; line-height: 1.6; }
    .overdue-days { background: rgba(255,0,0,0.2); padding: 15px; border-radius: 10px; color: #ff6666; font-size: 22px; font-weight: bold; margin: 20px 0; }
    .contact { background: rgba(255,170,0,0.1); padding: 15px; border-radius: 10px; margin-top: 20px; } .contact p { color: #ffaa00; margin: 5px 0; }
    hr { margin: 20px 0; border-color: #333; } .small { font-size: 12px; color: #666; } .block-date { font-size: 14px; color: #ff8888; margin-top: 10px; }
    </style></head><body>
    <div class="block-container">
        <div class="lock-icon">🔒</div><h1>ACESSO BLOQUEADO</h1>
        <p><strong style="color:#ffaa00;">BARBEARIA TRENCHES</strong></p>
        <p>O acesso ao site foi temporariamente bloqueado devido à falta de pagamento da assinatura mensal.</p>
        <div class="overdue-days">⚠️ Pagamento vencido há ${paymentStatus.daysOverdue} dias</div>
        <div class="contact"><p>📞 <strong>(11) 94848-4457</strong></p><p>📧 <strong>suporte@barbeariatrenches.com</strong></p></div>
        <hr><p class="small">Sistema de proteção de assinatura - CodeTecx</p>
        <p class="block-date">Último pagamento: ${paymentStatus.lastPayment.toLocaleDateString('pt-BR')}</p>
    </div></body></html>`;
}

// Middleware de bloqueio do site por falta de pagamento
const paymentBlocker = async (req, res, next) => {
    // 1. LIBERAÇÃO ABSOLUTA DO PAINEL ADMIN
    if (req.path === '/admin.html' || req.path === '/admin' || req.path === '/admin/') {
        return next();
    }

    // 2. Rotas de API que precisam funcionar para o admin
    const publicRoutes = [
        '/api/verify-payment', 
        '/api/register-payment', 
        '/api/payment-status',
        '/api/login',
        '/api/register',
        '/api/forgot-password',
        '/api/settings',
        '/api/barbers',
        '/api/bookings/all' // 🔥 ADICIONADO AQUI
    ];

    if (publicRoutes.includes(req.path)) {
        return next();
    }

    // 3. Libera arquivos estáticos
    if (/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot)$/i.test(req.path)) {
        return next();
    }

    // 4. Verifica o pagamento
    const paymentStatus = await getPaymentStatus();

    if (paymentStatus.isBlocked) {
        if (req.path.startsWith('/api/')) {
            return res.status(403).json({ error: 'Sistema bloqueado por falta de pagamento.', daysOverdue: paymentStatus.daysOverdue, isBlocked: true });
        }
        return res.status(403).send(renderBlockedHTML(paymentStatus));
    }

    next();
};

app.use(paymentBlocker);

// ========== SERVIDOR DE ARQUIVOS ESTÁTICOS ==========
app.use(express.static(path.join(__dirname, '..')));

app.get('/', async (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ========== API PARA VERIFICAR STATUS DO PAGAMENTO ==========
app.get('/api/payment-status', async (req, res) => {
    const status = await getPaymentStatus();
    res.json({
        success: true, isValid: status.isValid, daysOverdue: status.daysOverdue, graceDaysLeft: status.graceDaysLeft, lastPayment: status.lastPayment, nextDueDate: status.nextDueDate, isBlocked: status.isBlocked
    });
});

// ========== API PARA REGISTRAR PAGAMENTO (ADMIN) ==========
app.post('/api/register-payment', async (req, res) => {
    try {
        const { adminKey, paymentDate } = req.body;
        if (adminKey !== 'code@@') return res.status(403).json({ error: 'Chave de administrador inválida' });

        await ensureConnection();
        let paymentDoc = await Payment.findOne();
        const newPaymentDate = paymentDate ? new Date(paymentDate) : new Date();

        if (paymentDoc) {
            paymentDoc.lastPaymentDate = newPaymentDate;
            paymentDoc.lastUpdate = new Date();
            paymentDoc.registeredBy = 'admin';
            await paymentDoc.save();
        } else {
            paymentDoc = new Payment({ lastPaymentDate: newPaymentDate, lastUpdate: new Date(), registeredBy: 'admin' });
            await paymentDoc.save();
        }

        const nextDue = new Date(newPaymentDate.getFullYear(), newPaymentDate.getMonth() + 1, PAYMENT_DUE_DAY, 0, 0, 0, 0);
        console.log('✅ Pagamento registrado em:', newPaymentDate);
        res.json({ success: true, message: `Pagamento registrado! Próximo vencimento: ${nextDue.toLocaleDateString('pt-BR')}`, nextDueDate: nextDue });
    } catch (error) { res.status(500).json({ error: 'Erro interno' }); }
});

// ========== FUNÇÃO DE CONEXÃO ==========
async function ensureConnection() {
    try { await connectDB(); return true; } catch (error) { return false; }
}

// ============ CONFIGURAÇÕES GLOBAIS ============
app.get('/api/settings', async (req, res) => {
    try {
        await ensureConnection();
        let settings = await Setting.findOne();
        if (!settings) {
            settings = new Setting({ hours: { mon: 'FECHADO', tue: '09:00 - 20:00', wed: '09:00 - 20:00', thu: '09:00 - 21:00', fri: '09:00 - 21:00', sat: '09:00 - 18:00' }, services: [{ name: 'Cabelo', price: 40, duration: 45, id: 'cabelo' }], phone: '(11) 94848-4457', instagram: '@barbeariatrenches', address: 'Av. Maj. Melo, 35', blockedDates: [], almoco: { inicio: '12:00', fim: '13:00', dias: [2, 3, 4, 5, 6] } });
            await settings.save();
        }
        res.json(settings);
    } catch (error) { res.status(500).json({ error: 'Erro ao buscar configurações' }); }
});

app.post('/api/settings', async (req, res) => {
    try {
        await ensureConnection();
        const updates = req.body;
        let settings = await Setting.findOne();
        if (!settings) settings = new Setting();
        if (updates.hours) settings.hours = { ...settings.hours, ...updates.hours };
        if (updates.services) settings.services = updates.services;
        if (updates.phone) settings.phone = updates.phone;
        if (updates.instagram) settings.instagram = updates.instagram;
        if (updates.address) settings.address = updates.address;
        if (updates.blockedDates) settings.blockedDates = updates.blockedDates;
        if (updates.almoco) settings.almoco = updates.almoco;
        settings.updatedAt = Date.now();
        await settings.save();
        res.json({ message: 'Configurações salvas com sucesso!', settings });
    } catch (error) { res.status(500).json({ error: 'Erro ao salvar configurações' }); }
});

// ============ ROTAS DE BARBEIROS ============
app.get('/api/barbers', async (req, res) => {
    try { await ensureConnection(); res.json(await Barber.find().sort({ createdAt: -1 })); } 
    catch (error) { res.status(500).json({ error: 'Erro ao buscar barbeiros' }); }
});

app.get('/api/barbers/:id', async (req, res) => {
    try { await ensureConnection(); const barber = await Barber.findById(req.params.id); if (!barber) return res.status(404).json({ error: 'Barbeiro não encontrado' }); res.json(barber); } 
    catch (error) { res.status(500).json({ error: 'Erro ao buscar barbeiro' }); }
});

app.post('/api/barbers', async (req, res) => {
    try {
        await ensureConnection();
        const { name, photo } = req.body;
        if (!name || name.trim() === '') return res.status(400).json({ error: 'Nome é obrigatório' });
        const barber = new Barber({ name: name.trim(), photo: photo || 'images/avatar.png', role: 'BARBEIRO PROFISSIONAL' });
        await barber.save();
        res.json({ message: 'Barbeiro adicionado com sucesso!', barber });
    } catch (error) { res.status(500).json({ error: 'Erro ao adicionar barbeiro' }); }
});

app.put('/api/barbers/:id', async (req, res) => {
    try {
        await ensureConnection();
        const { name, photo } = req.body;
        if (!name || name.trim() === '') return res.status(400).json({ error: 'Nome é obrigatório' });
        const barber = await Barber.findByIdAndUpdate(req.params.id, { name: name.trim(), photo: photo || 'images/avatar.png', role: 'BARBEIRO PROFISSIONAL' }, { new: true });
        if (!barber) return res.status(404).json({ error: 'Barbeiro não encontrado' });
        res.json({ message: 'Barbeiro atualizado!', barber });
    } catch (error) { res.status(500).json({ error: 'Erro ao atualizar barbeiro' }); }
});

app.delete('/api/barbers/:id', async (req, res) => {
    try { await ensureConnection(); await Barber.findByIdAndDelete(req.params.id); res.json({ message: 'Barbeiro removido com sucesso!' }); } 
    catch (error) { res.status(500).json({ error: 'Erro ao remover barbeiro' }); }
});

// ============ ROTAS DE USUÁRIOS ============
app.post('/api/register', async (req, res) => {
    try {
        await ensureConnection();
        const { name, phone, password } = req.body;
        if (await User.findOne({ phone })) return res.status(400).json({ error: 'Celular ja cadastrado' });
        const user = new User({ name, phone, password: await bcrypt.hash(password, 10) });
        await user.save();
        res.json({ message: 'Cadastro realizado com sucesso!' });
    } catch (error) { res.status(500).json({ error: 'Erro ao cadastrar' }); }
});

app.post('/api/login', async (req, res) => {
    try {
        await ensureConnection();
        const { phone, password } = req.body;
        const user = await User.findOne({ phone });
        if (!user) return res.status(400).json({ error: 'Celular nao encontrado' });
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Senha incorreta' });

        res.json({ user: { id: user._id, name: user.name, phone: user.phone, isAdmin: user.isAdmin, isMaster: user.isMaster } });
    } catch (error) { res.status(500).json({ error: 'Erro ao fazer login' }); }
});

app.post('/api/admin/reset-password', async (req, res) => {
    try {
        await ensureConnection();
        const { phone, newPassword } = req.body;
        if (!phone || !newPassword) return res.status(400).json({ error: 'Telefone e nova senha sao obrigatorios' });
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const user = await User.findOneAndUpdate({ phone: phone }, { password: hashedPassword }, { new: true });
        if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' });
        res.json({ message: 'Senha resetada com sucesso!', user: { name: user.name, phone: user.phone, isAdmin: user.isAdmin } });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/admin/update-phone', async (req, res) => {
    try {
        await ensureConnection();
        const { oldPhone, newPhone } = req.body;
        if (!oldPhone || !newPhone) return res.status(400).json({ error: 'Telefones sao obrigatorios' });
        const user = await User.findOneAndUpdate({ phone: oldPhone }, { phone: newPhone }, { new: true });
        if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' });
        res.json({ message: 'Telefone atualizado com sucesso!', user: { name: user.name, phone: user.phone, isAdmin: user.isAdmin } });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============ ROTAS DE RESERVAS ============
app.post('/api/booking', async (req, res) => {
    const pay = await getPaymentStatus();
    if (pay.isBlocked) return res.status(403).json({ error: 'Sistema bloqueado por falta de pagamento.', daysOverdue: pay.daysOverdue, isBlocked: true });
    
    try {
        await ensureConnection();
        const { userId, userName, service, date, time } = req.body;
        if (!userId || !service || !date || !time) return res.status(400).json({ error: 'Preencha todos os campos.' });
        if (await Booking.findOne({ date, time })) return res.status(400).json({ error: 'Horário já reservado' });
        
        const booking = new Booking({ userId, userName, service, date, time });
        await booking.save();
        res.json({ success: true, message: 'Reserva confirmada!', booking });
    } catch (error) { res.status(500).json({ error: 'Erro ao fazer reserva' }); }
});

app.get('/api/bookings/all', async (req, res) => {
    try { await ensureConnection(); res.json(await Booking.find().sort({ date: 1, time: 1 })); } 
    catch (error) { res.status(500).json({ error: 'Erro ao buscar reservas' }); }
});

app.get('/api/bookings/:phone', async (req, res) => {
    const pay = await getPaymentStatus();
    if (pay.isBlocked) return res.status(403).json({ error: 'Sistema bloqueado por falta de pagamento.', daysOverdue: pay.daysOverdue, isBlocked: true });
    try { await ensureConnection(); res.json(await Booking.find({ userId: req.params.phone }).sort({ date: 1, time: 1 })); } 
    catch (error) { res.status(500).json({ error: 'Erro ao buscar reservas' }); }
});

app.post('/api/delete-booking', async (req, res) => {
    try {
        await ensureConnection();
        const { id, date, time, userId, userName } = req.body;
        let result = { deletedCount: 0 };
        if (id && mongoose.Types.ObjectId.isValid(id)) result = await Booking.deleteOne({ _id: new mongoose.Types.ObjectId(id) });
        if (result.deletedCount === 0 && date && time && userId) result = await Booking.deleteOne({ date, time, userId });
        if (result.deletedCount === 0 && date && time) result = await Booking.deleteOne({ date, time });
        if (result.deletedCount === 0 && userName && date && time) result = await Booking.deleteOne({ userName, date, time });
        
        if (result.deletedCount === 1) res.json({ success: true, message: 'Reserva deletada com sucesso!' });
        else res.json({ success: false, message: 'Reserva não encontrada' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/delete-booking/:id', async (req, res) => {
    try {
        await ensureConnection();
        const { id } = req.params;
        let result;
        if (mongoose.Types.ObjectId.isValid(id)) result = await Booking.deleteOne({ _id: new mongoose.Types.ObjectId(id) });
        else result = await Booking.deleteOne({ _id: id });
        
        if (result.deletedCount === 1) res.json({ success: true, message: 'Reserva deletada!' });
        else res.status(404).json({ success: false, message: 'Reserva não encontrada' });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ============ ROTAS DE FORGOT PASSWORD ============
app.post('/api/forgot-password', async (req, res) => {
    try {
        await ensureConnection();
        const { action, telefone, novaSenha } = req.body;

        if (action === 'find') {
            if (!telefone) return res.status(400).json({ success: false, message: 'Telefone é obrigatório' });
            let user = await User.findOne({ phone: telefone });
            if (!user) user = await User.findOne({ phone: telefone.replace(/\D/g, '') });
            if (user) return res.json({ success: true, nome: user.name });
            else return res.status(404).json({ success: false, message: 'Nenhuma conta encontrada com este número' });
        }

        if (action === 'reset') {
            if (!telefone || !novaSenha) return res.status(400).json({ success: false, message: 'Telefone e nova senha são obrigatórios' });
            if (novaSenha.length < 4) return res.status(400).json({ success: false, message: 'A nova senha deve ter pelo menos 4 caracteres' });
            let user = await User.findOne({ phone: telefone });
            if (!user) user = await User.findOne({ phone: telefone.replace(/\D/g, '') });
            if (!user) return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
            user.password = await bcrypt.hash(novaSenha, 10);
            await user.save();
            return res.json({ success: true, message: 'Senha alterada com sucesso!' });
        }

        return res.status(400).json({ success: false, message: 'Ação inválida' });
    } catch (error) { res.status(500).json({ success: false, message: 'Erro interno do servidor' }); }
});

// ========== USUÁRIO MESTRE / ADMIN ==========
async function createMasterUserIfNeeded() {
    await ensureConnection();
    if (!(await User.findOne({ phone: '11988568185' }))) {
        await new User({ name: 'Desenvolvedor CodeTecx', phone: '11988568185', password: await bcrypt.hash('code@@', 10), isAdmin: true, isMaster: true }).save();
        console.log('👑 Usuário Mestre criado: 11988568185 / code@@');
    }
}

async function createAdminIfNeeded() {
    await ensureConnection();
    if (!(await User.findOne({ phone: '11999999999' }))) {
        await new User({ name: 'Administrador', phone: '11999999999', password: await bcrypt.hash('admin123', 10), isAdmin: true }).save();
        console.log('👑 Admin criado: 11999999999 / admin123');
    }
}

(async () => {
    await ensureConnection();
    await createAdminIfNeeded();
    await createMasterUserIfNeeded();
    console.log('💰 Sistema de pagamento ativo | Vence todo dia 1 de cada mês');
})();

module.exports = app;