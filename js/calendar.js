// Sistema de Calendario e Agendamento
let currentDate = new Date();
let selectedDate = null;
let selectedTime = null;
let allBookings = [];

// DIAS FECHADOS (0 = Domingo, 1 = Segunda)
const DIAS_FECHADOS = [0, 1];

// Horario de funcionamento
const HORARIO_FUNCIONAMENTO = {
    0: null,     // Domingo - Fechado
    1: null,     // Segunda - Fechado
    2: { start: 9, end: 18.5 },   // Terca - 09h as 18:30
    3: { start: 9, end: 18.5 },   // Quarta - 09h as 18:30
    4: { start: 9, end: 18.5 },   // Quinta - 09h as 18:30
    5: { start: 9, end: 18.5 },   // Sexta - 09h as 18:30
    6: { start: 9, end: 18.5 }    // Sabado - 09h as 18:30
};

function formatDateStr(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDateDisplay(date) {
    const dias = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];
    return `${dias[date.getDay()]}, ${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

// Carregar datas bloqueadas do adminSettings
function getBlockedDates() {
    const settings = localStorage.getItem('adminSettings');
    if (settings) {
        try {
            const parsed = JSON.parse(settings);
            return parsed.blockedDates || [];
        } catch(e) {
            console.error('Erro ao ler blockedDates:', e);
        }
    }
    return [];
}

// Verificar se uma data esta bloqueada (feriados)
function isDateBlocked(date) {
    const blockedDates = getBlockedDates();
    const dateStr = formatDateStr(date);
    return blockedDates.includes(dateStr);
}

// Verificar se data esta disponivel
function isDateAvailable(date) {
    const dayOfWeek = date.getDay();
    
    // Verificar dias fechados (Domingo e Segunda)
    if (DIAS_FECHADOS.includes(dayOfWeek)) return false;
    
    // Verificar se a data ja passou
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return false;
    
    // Verificar se esta bloqueada (feriados)
    if (isDateBlocked(date)) return false;
    
    return true;
}

// Gerar horarios disponiveis - CORRIGIDO
function getAvailableTimes(date, bookings) {
    const dayOfWeek = date.getDay();
    const horario = HORARIO_FUNCIONAMENTO[dayOfWeek];
    if (!horario) return [];
    
    const times = [];
    const dateStr = formatDateStr(date);
    const isToday = formatDateStr(date) === formatDateStr(new Date());
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    const bookingsToday = bookings.filter(b => b.date === dateStr);
    const horariosReservados = bookingsToday.map(b => b.time);
    
    // Margem de segurança para evitar agendamentos em cima da hora (30 minutos)
    const MINUTOS_ANTECEDENCIA = 30;
    
    for (let hour = horario.start; hour < horario.end; hour++) {
        // Horário cheio (09:00, 10:00, etc)
        const timeFull = `${String(hour).padStart(2, '0')}:00`;
        let isPast = false;
        if (isToday) {
            // Verificar se o horário já passou (considerando 30 min de antecedência)
            if (hour < currentHour) {
                isPast = true;
            } else if (hour === currentHour) {
                // Se for o mesmo horário, verificar se já passou dos 30 min de antecedência
                if (currentMinute + MINUTOS_ANTECEDENCIA >= 60) {
                    // Se ultrapassar a hora, considerar como horário seguinte
                    isPast = true;
                } else if (currentMinute + MINUTOS_ANTECEDENCIA >= 0) {
                    isPast = true;
                }
            }
        }
        if (!isPast && !horariosReservados.includes(timeFull)) {
            times.push(timeFull);
        }
        
        // Meia hora (09:30, 10:30, etc)
        if (hour + 0.5 < horario.end) {
            const timeHalf = `${String(hour).padStart(2, '0')}:30`;
            let isPastHalf = false;
            if (isToday) {
                if (hour < currentHour) {
                    isPastHalf = true;
                } else if (hour === currentHour) {
                    // Verifica se já passou dos 30 min de antecedência para meia hora
                    if (30 + MINUTOS_ANTECEDENCIA <= currentMinute) {
                        isPastHalf = true;
                    }
                }
            }
            if (!isPastHalf && !horariosReservados.includes(timeHalf)) {
                times.push(timeHalf);
            }
        }
    }
    return times;
}

// Carregar reservas do backend
async function loadAllBookings() {
    try {
        const response = await fetch('/api/bookings/all');
        if (response.ok) {
            allBookings = await response.json();
            console.log(`${allBookings.length} reservas carregadas`);
        } else {
            const saved = localStorage.getItem('allBookings');
            if (saved) allBookings = JSON.parse(saved);
        }
    } catch (error) {
        console.log('Erro ao carregar reservas:', error);
        const saved = localStorage.getItem('allBookings');
        if (saved) allBookings = JSON.parse(saved);
    }
    return allBookings;
}

// Renderizar calendario
function renderCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    const currentMonthEl = document.getElementById('currentMonth');
    if (!calendarGrid) return;
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    
    const monthNames = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    currentMonthEl.textContent = `${monthNames[month]} ${year}`;
    
    calendarGrid.innerHTML = '';
    
    const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    weekdays.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-weekday';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });
    
    for (let i = 0; i < startDayOfWeek; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        calendarGrid.appendChild(emptyDay);
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, month, day);
        const isToday = date.toDateString() === today.toDateString();
        const isPast = date < today;
        const isAvailable = isDateAvailable(date) && !isPast;
        
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        if (isToday) dayEl.classList.add('today');
        if (isAvailable) dayEl.classList.add('available');
        if (!isAvailable) dayEl.classList.add('unavailable');
        dayEl.textContent = day;
        
        if (isAvailable) {
            dayEl.style.cursor = 'pointer';
            dayEl.addEventListener('click', () => selectDate(date));
        } else {
            dayEl.style.cursor = 'not-allowed';
            if (date.getDay() === 0) dayEl.title = 'Domingo - Fechado';
            else if (date.getDay() === 1) dayEl.title = 'Segunda-feira - Fechado';
            else if (isDateBlocked(date)) dayEl.title = 'Feriado - Barbearia Fechada';
            else if (isPast) dayEl.title = 'Data ja passou';
        }
        calendarGrid.appendChild(dayEl);
    }
}

// Selecionar data
async function selectDate(date) {
    console.log('Data selecionada:', formatDateDisplay(date));
    selectedDate = date;
    selectedTime = null;
    
    await loadAllBookings();
    
    const times = getAvailableTimes(date, allBookings);
    const timeSlotsContainer = document.getElementById('timeSlots');
    
    if (timeSlotsContainer) {
        if (times.length === 0) {
            timeSlotsContainer.innerHTML = '<div style="padding: 10px; text-align: center; color: var(--silver-soft);">Nenhum horario disponivel nesta data</div>';
        } else {
            timeSlotsContainer.innerHTML = times.map(t => `<button class="time-slot" data-time="${t}">${t}</button>`).join('');
            
            document.querySelectorAll('.time-slot').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectTime(btn.dataset.time);
                });
            });
        }
    }
    
    const confirmBtn = document.getElementById('confirmBookingBtn');
    if (confirmBtn) confirmBtn.disabled = true;
    
    document.querySelectorAll('.calendar-day').forEach(el => el.classList.remove('selected'));
    const dayElements = document.querySelectorAll('.calendar-day:not(.empty)');
    for (let el of dayElements) {
        if (parseInt(el.textContent) === date.getDate()) {
            el.classList.add('selected');
            break;
        }
    }
}

// Selecionar horario
function selectTime(time) {
    console.log('Horario selecionado:', time);
    selectedTime = time;
    
    document.querySelectorAll('.time-slot').forEach(el => el.classList.remove('selected'));
    const slots = document.querySelectorAll('.time-slot');
    for (let btn of slots) {
        if (btn.dataset.time === time) {
            btn.classList.add('selected');
            break;
        }
    }
    
    const confirmBtn = document.getElementById('confirmBookingBtn');
    if (confirmBtn) {
        confirmBtn.disabled = false;
    }
}

// CONFIRMAR RESERVA
async function confirmBooking() {
    console.log('Botao Confirmar clicado');
    
    const userJson = localStorage.getItem('currentUser');
    if (!userJson) {
        alert('Faça login para agendar');
        document.getElementById('bookingModal').style.display = 'none';
        document.getElementById('authModal').style.display = 'block';
        return;
    }
    
    const currentUser = JSON.parse(userJson);
    
    if (!selectedDate) {
        alert('Selecione uma data primeiro');
        return;
    }
    
    if (!selectedTime) {
        alert('Selecione um horario');
        return;
    }
    
    const serviceSelect = document.getElementById('bookingService');
    const service = serviceSelect ? serviceSelect.value : 'Cabelo';
    
    await loadAllBookings();
    const availableTimes = getAvailableTimes(selectedDate, allBookings);
    
    if (!availableTimes.includes(selectedTime)) {
        alert('Este horario nao esta mais disponivel. Por favor, selecione outro.');
        await selectDate(selectedDate);
        return;
    }
    
    const bookingData = {
        userId: currentUser.phone,
        userName: currentUser.name,
        service: service,
        date: formatDateStr(selectedDate),
        time: selectedTime
    };
    
    try {
        const response = await fetch('/api/booking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(`Reserva confirmada! ${service} para ${formatDateDisplay(selectedDate)} as ${selectedTime}`);
            
            selectedDate = null;
            selectedTime = null;
            document.getElementById('bookingModal').style.display = 'none';
            await renderCalendar();
            
            const timeSlotsContainer = document.getElementById('timeSlots');
            if (timeSlotsContainer) {
                timeSlotsContainer.innerHTML = '<div style="text-align:center; padding:10px;">Selecione uma data</div>';
            }
            
            const confirmBtn = document.getElementById('confirmBookingBtn');
            if (confirmBtn) confirmBtn.disabled = true;
        } else {
            alert('Erro: ' + (data.error || 'Falha ao fazer reserva'));
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro de conexao. Tente novamente.');
    }
}

// Mostrar minhas reservas
async function showMyBookings() {
    const userJson = localStorage.getItem('currentUser');
    if (!userJson) {
        alert('Faça login para ver sua agenda');
        document.getElementById('authModal').style.display = 'block';
        return;
    }
    
    const currentUser = JSON.parse(userJson);
    await loadAllBookings();
    
    const hoje = new Date();
    const hojeStr = formatDateStr(hoje);
    
    const myBookings = allBookings.filter(b => {
        if (b.userId !== currentUser.phone) return false;
        return b.date >= hojeStr;
    });
    
    myBookings.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.time.localeCompare(b.time);
    });
    
    if (myBookings.length === 0) {
        alert('Voce nao tem agendamentos futuros');
        return;
    }
    
    let message = 'MINHA AGENDA\n\n';
    myBookings.forEach((booking, index) => {
        const partes = booking.date.split('-');
        const dataFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`;
        message += `${index + 1}. ${dataFormatada} as ${booking.time}\n`;
        message += `   Servico: ${booking.service}\n\n`;
    });
    message += 'Para cancelar, entre em contato com a barbearia.';
    alert(message);
}

function prevMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    selectedDate = null;
    selectedTime = null;
    renderCalendar();
    
    const timeSlotsContainer = document.getElementById('timeSlots');
    if (timeSlotsContainer) {
        timeSlotsContainer.innerHTML = '<div style="text-align:center; padding:10px;">Selecione uma data</div>';
    }
    
    const confirmBtn = document.getElementById('confirmBookingBtn');
    if (confirmBtn) confirmBtn.disabled = true;
}

function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    selectedDate = null;
    selectedTime = null;
    renderCalendar();
    
    const timeSlotsContainer = document.getElementById('timeSlots');
    if (timeSlotsContainer) {
        timeSlotsContainer.innerHTML = '<div style="text-align:center; padding:10px;">Selecione uma data</div>';
    }
    
    const confirmBtn = document.getElementById('confirmBookingBtn');
    if (confirmBtn) confirmBtn.disabled = true;
}

async function initCalendar() {
    console.log('Inicializando calendario...');
    currentDate = new Date();
    selectedDate = null;
    selectedTime = null;
    
    await loadAllBookings();
    renderCalendar();
    
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');
    const myBookingsBtn = document.getElementById('myBookingsBtn');
    const confirmBtn = document.getElementById('confirmBookingBtn');
    
    if (prevBtn) {
        const newPrevBtn = prevBtn.cloneNode(true);
        prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
        newPrevBtn.onclick = prevMonth;
    }
    
    if (nextBtn) {
        const newNextBtn = nextBtn.cloneNode(true);
        nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
        newNextBtn.onclick = nextMonth;
    }
    
    if (myBookingsBtn) {
        const newMyBookingsBtn = myBookingsBtn.cloneNode(true);
        myBookingsBtn.parentNode.replaceChild(newMyBookingsBtn, myBookingsBtn);
        newMyBookingsBtn.onclick = showMyBookings;
    }
    
    if (confirmBtn) {
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        newConfirmBtn.onclick = confirmBooking;
        newConfirmBtn.disabled = true;
    }
    
    console.log('Calendario inicializado - Dias fechados: Domingo, Segunda e datas bloqueadas');
}

window.initCalendar = initCalendar;
window.confirmBooking = confirmBooking;
window.showMyBookings = showMyBookings;
window.renderCalendar = renderCalendar;

console.log('Calendar.js carregado - Dias fechados: Domingo, Segunda e datas bloqueadas');