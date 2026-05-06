// Sistema de autenticação - MongoDB Atlas
const API_URL = 'http://localhost:3000/api';

let currentUser = null;

// Elementos
const loginBtn = document.getElementById('loginBtn');
const modal = document.getElementById('authModal');
const bookingModal = document.getElementById('bookingModal');
const adminModal = document.getElementById('adminModal');
const closeBtns = document.querySelectorAll('.close');
const tabBtns = document.querySelectorAll('.tab-btn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const userInfo = document.getElementById('userInfo');
const userNameSpan = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');
const adminPanelBtn = document.getElementById('adminPanelBtn');
const mobileAdminBtn = document.getElementById('mobileAdminBtn');

// Função para mostrar mensagem
function showMessage(message) {
    const toastModal = document.getElementById('toastModal');
    const toastMessage = document.getElementById('toastMessage');
    if (toastModal && toastMessage) {
        toastMessage.textContent = message;
        toastModal.style.display = 'block';
    } else {
        alert(message);
    }
}

// Função para verificar se é admin
function isAdmin(user) {
    return user && user.isAdmin === true;
}

// Mostrar botão do gestor se for admin
function showAdminButtonIfNeeded(user) {
    if (adminPanelBtn && isAdmin(user)) {
        adminPanelBtn.style.display = 'block';
    }
    if (mobileAdminBtn && isAdmin(user)) {
        mobileAdminBtn.style.display = 'block';
    }
}

// Função para verificar login
function isLoggedIn() {
    if (!currentUser) {
        if (modal) modal.style.display = 'block';
        return false;
    }
    return true;
}

// Botões de reserva
const reservaBtns = ['agendarBtn', 'footerReservarBtn', 'menuReservasBtn', 'mobileReservasBtn'];
reservaBtns.forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (isLoggedIn() && bookingModal) {
                if (typeof initCalendar === 'function') {
                    initCalendar();
                }
                bookingModal.style.display = 'block';
            }
        });
    }
});

// Abrir modal de login
if (loginBtn) {
    loginBtn.onclick = () => {
        if (modal) modal.style.display = 'block';
    };
}

// Abrir modal do gestor
if (adminPanelBtn) {
    adminPanelBtn.onclick = () => {
        if (isAdmin(currentUser)) {
            window.location.href = 'admin.html';
        } else {
            showMessage('⚠️ Acesso restrito. Apenas administradores.');
        }
    };
}

if (mobileAdminBtn) {
    mobileAdminBtn.onclick = () => {
        if (isAdmin(currentUser)) {
            window.location.href = 'admin.html';
        } else {
            showMessage('⚠️ Acesso restrito. Apenas administradores.');
        }
    };
}

// Carregar configurações do admin
function loadAdminSettings() {
    const settings = JSON.parse(localStorage.getItem('adminSettings') || '{}');
    
    const priceCorte = document.getElementById('adminPriceCorte');
    const priceBarba = document.getElementById('adminPriceBarba');
    const priceCombo = document.getElementById('adminPriceCombo');
    const pricePacote = document.getElementById('adminPricePacote');
    const adminAddress = document.getElementById('adminAddress');
    const adminPhone = document.getElementById('adminPhone');
    const hourMon = document.getElementById('adminHourMon');
    const hourTue = document.getElementById('adminHourTue');
    const hourWed = document.getElementById('adminHourWed');
    const hourThu = document.getElementById('adminHourThu');
    const hourFri = document.getElementById('adminHourFri');
    const hourSat = document.getElementById('adminHourSat');
    
    if (priceCorte) priceCorte.value = settings.priceCorte || 40;
    if (priceBarba) priceBarba.value = settings.priceBarba || 40;
    if (priceCombo) priceCombo.value = settings.priceCombo || 80;
    if (pricePacote) pricePacote.value = settings.pricePacote || 110;
    if (adminAddress) adminAddress.value = settings.address || 'Av. Henrique Eroles, 1168, Mogi das Cruzes - SP';
    if (adminPhone) adminPhone.value = settings.phone || '(11) 94848-4457';
    if (hourMon) hourMon.value = settings.hourMon || '09:00 - 20:00';
    if (hourTue) hourTue.value = settings.hourTue || '09:00 - 20:00';
    if (hourWed) hourWed.value = settings.hourWed || '09:00 - 20:00';
    if (hourThu) hourThu.value = settings.hourThu || '09:00 - 21:00';
    if (hourFri) hourFri.value = settings.hourFri || '09:00 - 21:00';
    if (hourSat) hourSat.value = settings.hourSat || '09:00 - 20:00';
}

// Salvar configurações do admin
const saveAdminBtn = document.getElementById('saveAdminSettings');
if (saveAdminBtn) {
    saveAdminBtn.onclick = () => {
        const settings = {
            priceCorte: document.getElementById('adminPriceCorte')?.value || 40,
            priceBarba: document.getElementById('adminPriceBarba')?.value || 40,
            priceCombo: document.getElementById('adminPriceCombo')?.value || 80,
            pricePacote: document.getElementById('adminPricePacote')?.value || 110,
            address: document.getElementById('adminAddress')?.value || '',
            phone: document.getElementById('adminPhone')?.value || '',
            hourMon: document.getElementById('adminHourMon')?.value || '09:00 - 20:00',
            hourTue: document.getElementById('adminHourTue')?.value || '09:00 - 20:00',
            hourWed: document.getElementById('adminHourWed')?.value || '09:00 - 20:00',
            hourThu: document.getElementById('adminHourThu')?.value || '09:00 - 21:00',
            hourFri: document.getElementById('adminHourFri')?.value || '09:00 - 21:00',
            hourSat: document.getElementById('adminHourSat')?.value || '09:00 - 20:00'
        };
        
        localStorage.setItem('adminSettings', JSON.stringify(settings));
        applyAdminSettings(settings);
        showMessage(' Configurações salvas com sucesso!');
        if (adminModal) adminModal.style.display = 'none';
    };
}

// Aplicar configurações no site
function applyAdminSettings(settings) {
    const priceElements = document.querySelectorAll('.price-value');
    if (priceElements.length >= 4) {
        priceElements[0].textContent = `R$${settings.priceCorte}`;
        priceElements[1].textContent = `R$${settings.priceBarba}`;
        priceElements[2].textContent = `R$${settings.priceCombo}`;
        priceElements[3].textContent = `R$${settings.pricePacote}`;
    }
    
    const addressEl = document.getElementById('contactAddress');
    if (addressEl) addressEl.innerHTML = settings.address.replace(/\n/g, '<br>');
    
    const phoneEl = document.getElementById('contactPhone');
    if (phoneEl) phoneEl.innerHTML = settings.phone;
    
    const hourMon = document.getElementById('hourMon');
    const hourTue = document.getElementById('hourTue');
    const hourWed = document.getElementById('hourWed');
    const hourThu = document.getElementById('hourThu');
    const hourFri = document.getElementById('hourFri');
    const hourSat = document.getElementById('hourSat');
    
    if (hourMon) hourMon.innerHTML = settings.hourMon;
    if (hourTue) hourTue.innerHTML = settings.hourTue;
    if (hourWed) hourWed.innerHTML = settings.hourWed;
    if (hourThu) hourThu.innerHTML = settings.hourThu;
    if (hourFri) hourFri.innerHTML = settings.hourFri;
    if (hourSat) hourSat.innerHTML = settings.hourSat;
}

// Fechar modais
closeBtns.forEach(btn => {
    btn.onclick = () => {
        if (modal) modal.style.display = 'none';
        if (bookingModal) bookingModal.style.display = 'none';
        if (adminModal) adminModal.style.display = 'none';
    };
});

window.onclick = (e) => {
    if (e.target === modal) modal.style.display = 'none';
    if (e.target === bookingModal) bookingModal.style.display = 'none';
    if (e.target === adminModal) adminModal.style.display = 'none';
};

// Tabs
tabBtns.forEach(btn => {
    btn.onclick = () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const tab = btn.dataset.tab;
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });
        const form = document.getElementById(`${tab}Form`);
        if (form) form.classList.add('active');
    };
});

// CADASTRO
if (registerForm) {
    registerForm.onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value.trim();
        const phone = document.getElementById('regPhone').value.trim();
        const password = document.getElementById('regPassword').value;
        const confirm = document.getElementById('regConfirm').value;
        
        // Validações
        if (!name || !phone || !password) {
            showMessage('⚠️ Preencha todos os campos');
            return;
        }
        
        if (password !== confirm) {
            showMessage('⚠️ As senhas não coincidem');
            return;
        }
        
        if (password.length < 4) {
            showMessage('⚠️ A senha deve ter pelo menos 4 caracteres');
            return;
        }
        
        console.log('Tentando cadastrar:', { name, phone });
        
        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, password })
            });
            
            const data = await response.json();
            console.log('Resposta do cadastro:', data);
            
            if (response.ok) {
                showMessage('Cadastro realizado! Faça login.');
                const loginTab = document.querySelector('.tab-btn[data-tab="login"]');
                if (loginTab) loginTab.click();
                registerForm.reset();
            } else {
                showMessage(`⚠️ ${data.error || 'Erro ao cadastrar'}`);
            }
        } catch (error) {
            console.error('Erro no cadastro:', error);
            showMessage('❌ Erro ao conectar com o servidor.');
        }
    };
}

// LOGIN
if (loginForm) {
    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const phone = document.getElementById('loginPhone').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        // Validações
        if (!phone || !password) {
            showMessage('⚠️ Preencha todos os campos');
            return;
        }
        
        console.log('Tentando login:', { phone });
        
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, password })
            });
            
            const data = await response.json();
            console.log('Resposta do login:', data);
            
            if (response.ok && data.user) {
                currentUser = data.user;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                // Salvar flag de admin
                if (data.user.isAdmin) {
                    localStorage.setItem('isAdmin', 'true');
                } else {
                    localStorage.removeItem('isAdmin');
                }
                
                // Atualizar interface
                if (userNameSpan) userNameSpan.textContent = currentUser.name;
                if (loginBtn) loginBtn.style.display = 'none';
                if (userInfo) userInfo.style.display = 'flex';
                if (modal) modal.style.display = 'none';
                loginForm.reset();
                
                showAdminButtonIfNeeded(currentUser);
                
                // Atualizar avatar no header
                if (typeof updateHeaderAvatar === 'function') {
                    updateHeaderAvatar();
                }
                
                showMessage(` Bem-vindo, ${currentUser.name}!`);
                
                // Se for admin, redirecionar para o painel
                if (data.user.isAdmin) {
                    console.log('Admin logado!');
                }
            } else {
                const errorMsg = data.error || 'Celular ou senha incorretos!';
                console.error('Erro no login:', errorMsg);
                showMessage(`❌ ${errorMsg}`);
            }
        } catch (error) {
            console.error('Erro de conexão:', error);
            showMessage('❌ Erro ao conectar com o servidor. Verifique se o backend está rodando.');
        }
    };
}

// Logout
if (logoutBtn) {
    logoutBtn.onclick = () => {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isAdmin');
        currentUser = null;
        if (loginBtn) loginBtn.style.display = 'block';
        if (userInfo) userInfo.style.display = 'none';
        if (adminPanelBtn) adminPanelBtn.style.display = 'none';
        if (mobileAdminBtn) mobileAdminBtn.style.display = 'none';
        showMessage('Você saiu da sua conta');
    };
}

// Verificar usuário salvo ao carregar a página
const savedUser = localStorage.getItem('currentUser');
if (savedUser && loginBtn) {
    try {
        currentUser = JSON.parse(savedUser);
        if (userNameSpan) userNameSpan.textContent = currentUser.name;
        loginBtn.style.display = 'none';
        if (userInfo) userInfo.style.display = 'flex';
        showAdminButtonIfNeeded(currentUser);
        
        // Atualizar avatar
        if (typeof updateHeaderAvatar === 'function') {
            updateHeaderAvatar();
        }
    } catch (e) {
        console.error('Erro ao carregar usuário salvo:', e);
        localStorage.removeItem('currentUser');
    }
}

// Mobile login button
const mobileLoginBtn = document.getElementById('mobileLoginBtn');
if (mobileLoginBtn) {
    mobileLoginBtn.onclick = () => {
        if (modal) modal.style.display = 'block';
    };
}

// Aplicar configurações salvas
const savedSettings = localStorage.getItem('adminSettings');
if (savedSettings) {
    try {
        applyAdminSettings(JSON.parse(savedSettings));
    } catch (e) {
        console.error('Erro ao aplicar configurações:', e);
    }
}

console.log('Auth.js carregado com sucesso!');