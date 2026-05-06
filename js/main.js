// Mobile Menu Toggle
document.addEventListener('DOMContentLoaded', function() {
    const mobileToggle = document.getElementById('mobile-toggle');
    const navPanel = document.getElementById('nav-panel');
    
    if (mobileToggle) {
        mobileToggle.addEventListener('click', function() {
            if (navPanel.style.display === 'none' || navPanel.style.display === '') {
                navPanel.style.display = 'block';
            } else {
                navPanel.style.display = 'none';
            }
        });
    }
    
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                if (navPanel) {
                    navPanel.style.display = 'none';
                }
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Header fica escuro ao rolar a página
    const header = document.querySelector('.header-wrapper');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }
    
    // Contact Form Submission com validação do checkbox "Não sou um robô"
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Verificar se o checkbox "Não sou um robô" está marcado
            const recaptchaCheck = document.querySelector('.recaptcha-checkbox input');
            if (recaptchaCheck && !recaptchaCheck.checked) {
                alert('⚠️ Por favor, confirme que você não é um robô marcando o checkbox.');
                return;
            }
            
            // Verificar se todos os campos obrigatórios estão preenchidos
            const nome = contactForm.querySelector('input[placeholder="Nome:"]');
            const telefone = contactForm.querySelector('input[placeholder="Telefone:"]');
            const email = contactForm.querySelector('input[placeholder="E-mail:"]');
            const mensagem = contactForm.querySelector('textarea');
            
            if (nome && !nome.value.trim()) {
                alert('⚠️ Por favor, preencha o campo Nome.');
                nome.focus();
                return;
            }
            
            if (telefone && !telefone.value.trim()) {
                alert('⚠️ Por favor, preencha o campo Telefone.');
                telefone.focus();
                return;
            }
            
            if (email && !email.value.trim()) {
                alert('⚠️ Por favor, preencha o campo E-mail.');
                email.focus();
                return;
            }
            
            if (mensagem && !mensagem.value.trim()) {
                alert('⚠️ Por favor, preencha o campo Mensagem.');
                mensagem.focus();
                return;
            }
            
            // Se tudo estiver ok, mostra mensagem de sucesso
            alert('✅ Mensagem enviada com sucesso! Entraremos em contato em breve.');
            this.reset();
        });
    }
});