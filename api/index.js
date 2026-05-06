const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const connectDB = require('./connect');
const User = require('./models/User');
const Booking = require('./models/Booking');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// ============ SERVIR ARQUIVOS ESTÁTICOS ============
app.use(express.static(path.join(__dirname, '..')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});
// ==================================================

// Função para garantir conexão antes das operações
async function ensureConnection() {
    try {
        await connectDB();
        return true;
    } catch (error) {
        console.error('Erro na conexão:', error);
        return false;
    }
}

// Rota de teste
app.get('/api', async (req, res) => {
    await ensureConnection();
    res.json({ message: 'API da Barbearia Trenches funcionando!' });
});

// Cadastro
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

// Login
app.post('/api/login', async (req, res) => {
    try {
        await ensureConnection();
        const { phone, password } = req.body;
        console.log('Tentativa de login:', phone);
        
        const user = await User.findOne({ phone });
        if (!user) {
            console.log('Usuario nao encontrado:', phone);
            return res.status(400).json({ error: 'Celular nao encontrado' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            console.log('Senha incorreta para:', phone);
            return res.status(400).json({ error: 'Senha incorreta' });
        }
        
        console.log('Login bem-sucedido:', user.name);
        
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

// Rota para resetar senha do admin
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
        
        if (!user) {
            return res.status(404).json({ error: 'Usuario nao encontrado' });
        }
        
        console.log('Senha resetada para:', phone);
        
        res.json({ 
            message: 'Senha resetada com sucesso!',
            novaSenha: newPassword,
            user: { name: user.name, phone: user.phone, isAdmin: user.isAdmin }
        });
    } catch (error) {
        console.error('Erro ao resetar senha:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para atualizar telefone do admin
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
        
        if (!user) {
            return res.status(404).json({ error: 'Usuario nao encontrado' });
        }
        
        console.log('Telefone atualizado:', oldPhone, '->', newPhone);
        
        res.json({ 
            message: 'Telefone atualizado com sucesso!',
            user: { name: user.name, phone: user.phone, isAdmin: user.isAdmin }
        });
    } catch (error) {
        console.error('Erro ao atualizar telefone:', error);
        res.status(500).json({ error: error.message });
    }
});

// Criar admin fixo se nao existir
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
            console.log('Admin criado: 11999999999 / admin123');
        } else {
            console.log('Admin ja existe');
        }
    } catch (error) {
        console.error('Erro ao criar admin:', error);
    }
}

// Reserva
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
        
        console.log('Reserva criada:', date, time, '-', userName);
        res.json({ message: 'Reserva confirmada!', booking });
    } catch (error) {
        console.error('Erro ao criar reserva:', error);
        res.status(500).json({ error: 'Erro ao fazer reserva' });
    }
});

// Buscar todas as reservas
app.get('/api/bookings/all', async (req, res) => {
    try {
        await ensureConnection();
        const bookings = await Booking.find().sort({ date: 1, time: 1 });
        console.log('Encontradas', bookings.length, 'reservas');
        res.json(bookings);
    } catch (error) {
        console.error('Erro ao buscar reservas:', error);
        res.status(500).json({ error: 'Erro ao buscar reservas' });
    }
});

// Buscar reservas do usuario
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

// Inicializar
(async () => {
    await ensureConnection();
    await createAdminIfNeeded();
})();
// ============ ESQUECI MINHA SENHA - PARA USUÁRIOS ============
app.post('/api/forgot-password', async (req, res) => {
    try {
        await ensureConnection();
        const { action, telefone, novaSenha } = req.body;
        
        console.log('📞 Forgot password request:', { action, telefone });
        
        // BUSCAR USUÁRIO POR TELEFONE
        if (action === 'find') {
            if (!telefone) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Telefone é obrigatório' 
                });
            }
            
            // Buscar por telefone exato
            let user = await User.findOne({ phone: telefone });
            
            // Se não encontrou, tentar buscar sem formatação (apenas números)
            if (!user) {
                const apenasNumeros = telefone.replace(/\D/g, '');
                user = await User.findOne({ phone: apenasNumeros });
            }
            
            if (user) {
                console.log('✅ Usuário encontrado:', user.name);
                return res.json({ 
                    success: true, 
                    nome: user.name,
                    message: 'Usuário encontrado!' 
                });
            } else {
                console.log('❌ Usuário NÃO encontrado para telefone:', telefone);
                return res.status(404).json({ 
                    success: false, 
                    message: 'Nenhuma conta encontrada com este número de celular' 
                });
            }
        }
        
        // ALTERAR SENHA
        if (action === 'reset') {
            if (!telefone || !novaSenha) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Telefone e nova senha são obrigatórios' 
                });
            }
            
            if (novaSenha.length < 4) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'A nova senha deve ter pelo menos 4 caracteres' 
                });
            }
            
            // Buscar o usuário primeiro
            let user = await User.findOne({ phone: telefone });
            
            if (!user) {
                const apenasNumeros = telefone.replace(/\D/g, '');
                user = await User.findOne({ phone: apenasNumeros });
            }
            
            if (!user) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Usuário não encontrado' 
                });
            }
            
            // Hash da nova senha
            const hashedPassword = await bcrypt.hash(novaSenha, 10);
            
            // Atualizar a senha
            user.password = hashedPassword;
            await user.save();
            
            console.log('✅ Senha alterada para usuário:', user.name, 'telefone:', telefone);
            
            return res.json({ 
                success: true, 
                message: 'Senha alterada com sucesso!' 
            });
        }
        
        return res.status(400).json({ 
            success: false, 
            message: 'Ação inválida' 
        });
        
    } catch (error) {
        console.error('❌ Erro no forgot-password:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro interno do servidor' 
        });
    }
});

module.exports = app;