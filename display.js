/* ==========================================================================
   DISPLAY MONITOR JAVASCRIPT - display.js
   Logic for real-time storage event listeners, Web Audio chimes, 
   Clock date updates, and Indonesian Text-to-Speech call triggering
   ========================================================================== */

let lastCalledId = null;
let currentFilterDate = '';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Clock & Date Initialization
    startClock();
    
    // Set default date filter to today (equivalent to what's checked in other files)
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    currentFilterDate = `${yyyy}-${mm}-${dd}`;

    // Initialize Database local data checking
    if (!localStorage.getItem('reservations')) {
        localStorage.setItem('reservations', JSON.stringify([]));
    }

    // 2. Initial Data Load
    syncData();

    // 3. Storage Event Listener for real-time call broadcasts
    window.addEventListener('storage', (e) => {
        if (e.key === 'reservations') {
            syncData();
        }
        if (e.key === 'lastCalledTicket') {
            try {
                const data = JSON.parse(e.newValue);
                if (data && data.queue_number) {
                    syncData();
                    triggerCallNotification(data.queue_number, data.full_name);
                }
            } catch (err) {
                console.error('Failed to parse call broadcast', err);
            }
        }
    });

    // 4. Polling Fallback (in case storage event is delayed or tabs run in same process context)
    setInterval(syncData, 1000);

    // Audio init listener (browser blocks web audio until first user interaction)
    document.body.addEventListener('click', () => {
        // Trigger a silent AudioContext init on click to unlock audio for browser
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            const ctx = new AudioContext();
            ctx.resume();
        }
    }, { once: true });
});

// 1. Digital Clock Widget
function startClock() {
    const clockEl = document.getElementById('display-clock');
    const dateEl = document.getElementById('display-date');
    
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    function update() {
        const now = new Date();
        
        // Format Time (00:00:00)
        const hrs = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        const secs = String(now.getSeconds()).padStart(2, '0');
        if (clockEl) {
            clockEl.innerHTML = `<i class="fa-regular fa-clock"></i> ${hrs}:${mins}:${secs}`;
        }
        
        // Format Date (Day, DD Month YYYY)
        const dayName = days[now.getDay()];
        const dateNum = now.getDate();
        const monthName = months[now.getMonth()];
        const year = now.getFullYear();
        if (dateEl) {
            dateEl.innerHTML = `<i class="fa-regular fa-calendar"></i> ${dayName}, ${dateNum} ${monthName} ${year}`;
        }
    }
    
    update();
    setInterval(update, 1000);
}

// Helper: Get data from LocalStorage
function getReservations() {
    return JSON.parse(localStorage.getItem('reservations')) || [];
}

// 2. Data Synchronization & Call Trigger
function syncData() {
    const reservations = getReservations();
    
    // Find serving queue for today
    const todayReservations = reservations.filter(r => r.reservation_date === currentFilterDate);
    const servingQueue = todayReservations.find(r => r.status === 'serving');
    
    const callNumEl = document.getElementById('call-num');
    const callNameEl = document.getElementById('call-name');
    
    if (servingQueue) {
        // If there's a new call that hasn't been triggered on this screen
        if (lastCalledId !== servingQueue.id) {
            lastCalledId = servingQueue.id;
            
            // Update Text Displays
            if (callNumEl) callNumEl.innerText = servingQueue.queue_number;
            if (callNameEl) callNameEl.innerText = servingQueue.full_name;
            
            // Trigger Visual Animation Chimes & TTS
            triggerCallNotification(servingQueue.queue_number, servingQueue.full_name);
        }
    } else {
        lastCalledId = null;
        if (callNumEl) callNumEl.innerText = 'A-000';
        if (callNameEl) callNameEl.innerText = 'Mempersiapkan Antrean...';
    }
    
    // Update Sidebar Lists
    updateSidebarLists(todayReservations);
}

// 3. Play sound chimes (Ding-Dong) using Web Audio API
function playChimeTone() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    
    // Play Note 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    osc1.type = 'triangle'; // Soft premium sound compared to 'sine' or 'sawtooth'
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
    
    gain1.gain.setValueAtTime(0, ctx.currentTime);
    gain1.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.05); // Fade in
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45); // Fade out
    
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.45);
    
    // Play Note 2: C5 (523.25 Hz) after 0.35s delay
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(523.25, ctx.currentTime + 0.35);
    
    gain2.gain.setValueAtTime(0, ctx.currentTime + 0.35);
    gain2.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.4); // Fade in
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.95); // Fade out
    
    osc2.start(ctx.currentTime + 0.35);
    osc2.stop(ctx.currentTime + 0.95);
}

// 4. Indonesian Queue Voice TTS Panggilan
function speakQueueCall(queueNumber, name) {
    if (!('speechSynthesis' in window)) return;
    
    // Cancel ongoing talks
    window.speechSynthesis.cancel();
    
    // Convert 'A-002' to 'A, nol, nol, dua'
    const rawNum = queueNumber.split('-')[1];
    const spokenDigits = rawNum.split('').map(digit => {
        if (digit === '0') return 'nol';
        return digit;
    }).join(' ');
    
    const text = `Antrean nomor A, ${spokenDigits}, atas nama ${name}, silakan menuju loket layanan utama.`;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 0.85; // Natural speed
    utterance.pitch = 1.0;
    
    // Find Indonesian local voice
    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find(voice => voice.lang.includes('id') || voice.lang.includes('ID'));
    if (idVoice) {
        utterance.voice = idVoice;
    }
    
    window.speechSynthesis.speak(utterance);
}

// Trigger Notifications (visual animation, sound chime, then voice)
function triggerCallNotification(queueNumber, name) {
    // Visual Alert Effect
    const mainCard = document.querySelector('.main-call-card');
    if (mainCard) {
        mainCard.classList.remove('pulse-alert');
        void mainCard.offsetWidth; // Trigger reflow for CSS keyframe animation restart
        mainCard.classList.add('pulse-alert');
    }
    
    // 1. Play Chime sound
    playChimeTone();
    
    // 2. Play TTS Voice after chime finished (950ms delay)
    setTimeout(() => {
        speakQueueCall(queueNumber, name);
    }, 950);
}

// 5. Sidebar Lists Render (Upcoming & Completed)
function updateSidebarLists(todayReservations) {
    // 1. Upcoming list (status: waiting, sorted ascending)
    const upcomingListEl = document.getElementById('upcoming-list');
    const waitingList = todayReservations
        .filter(r => r.status === 'waiting')
        .sort((a, b) => {
            const numA = parseInt(a.queue_number.split('-')[1]);
            const numB = parseInt(b.queue_number.split('-')[1]);
            return numA - numB;
        });

    if (upcomingListEl) {
        upcomingListEl.innerHTML = '';
        if (waitingList.length === 0) {
            upcomingListEl.innerHTML = '<li class="sidebar-list-item text-center text-muted">Tidak ada antrean tunggu</li>';
        } else {
            // Take up to 4 items
            waitingList.slice(0, 4).forEach(res => {
                const li = document.createElement('li');
                li.className = 'sidebar-list-item';
                li.innerHTML = `
                    <span class="sidebar-item-num">${res.queue_number}</span>
                    <span class="sidebar-item-name">${res.full_name}</span>
                `;
                upcomingListEl.appendChild(li);
            });
        }
    }

    // 2. Completed list (status: completed, sorted descending by created_at or number)
    const completedListEl = document.getElementById('completed-list');
    const completedList = todayReservations
        .filter(r => r.status === 'completed')
        .sort((a, b) => {
            const numA = parseInt(a.queue_number.split('-')[1]);
            const numB = parseInt(b.queue_number.split('-')[1]);
            return numB - numA; // Descending order (latest completed first)
        });

    if (completedListEl) {
        completedListEl.innerHTML = '';
        if (completedList.length === 0) {
            completedListEl.innerHTML = '<li class="sidebar-list-item text-center text-muted">Belum ada antrean selesai</li>';
        } else {
            // Take up to 4 items
            completedList.slice(0, 4).forEach(res => {
                const li = document.createElement('li');
                li.className = 'sidebar-list-item';
                li.innerHTML = `
                    <span class="sidebar-item-num completed">${res.queue_number}</span>
                    <span class="sidebar-item-name">${res.full_name}</span>
                `;
                completedListEl.appendChild(li);
            });
        }
    }
}

// --- Educational Slider Logic ---
let currentSlide = 0;
const slides = document.querySelectorAll('.edu-slide');
const dots = document.querySelectorAll('.edu-dots .dot');

function showSlide(index) {
    if (!slides.length) return;
    
    slides.forEach((slide, i) => {
        slide.classList.remove('active');
        if(dots[i]) dots[i].classList.remove('active');
    });
    
    slides[index].classList.add('active');
    if(dots[index]) dots[index].classList.add('active');
}

function nextSlide() {
    if (!slides.length) return;
    currentSlide = (currentSlide + 1) % slides.length;
    showSlide(currentSlide);
}

// Auto slide every 10 seconds
setInterval(nextSlide, 10000);
