/* ==========================================================================
   DISPLAY MONITOR JAVASCRIPT - display.js
   Logic for real-time API polling, Web Audio chimes, 
   Clock date updates, and Indonesian Text-to-Speech call triggering
   ========================================================================== */

let lastCalledTicketNum = null;
let lastCalledTimestamp = null; // Track timestamp untuk deteksi panggil ulang
let currentFilterDate = '';
let reservationsCache = [];

document.addEventListener('DOMContentLoaded', () => {
    // 1. Clock & Date Initialization
    startClock();
    
    // Set default date filter to today
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    currentFilterDate = `${yyyy}-${mm}-${dd}`;

    // 2. Initial Data Load
    syncData();

    // 3. Polling the Cloudflare API every 2.5 seconds
    setInterval(syncData, 2500);

    // Audio init listener (browser blocks web audio until first user interaction)
    const overlay = document.getElementById('audio-enable-overlay');
    if (overlay) {
        overlay.addEventListener('click', () => {
            // Aktifkan Audio Context
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                const ctx = new AudioContext();
                ctx.resume();
            }
            
            // Inisialisasi Speech Synthesizer agar browser memberi izin
            if ('speechSynthesis' in window) {
                const msg = new SpeechSynthesisUtterance('');
                window.speechSynthesis.speak(msg);
            }
            
            // Sembunyikan overlay
            overlay.style.display = 'none';
        });
    }
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
        const hrs = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        const secs = String(now.getSeconds()).padStart(2, '0');
        if (clockEl) {
            clockEl.innerHTML = `<i class="fa-regular fa-clock"></i> ${hrs}:${mins}:${secs}`;
        }
        
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

// 2. Data Synchronization & Call Trigger via API
async function syncData() {
    try {
        // Fetch all reservations for the sidebar
        const resResponse = await fetch('/api/reservations');
        if (resResponse.ok) {
            reservationsCache = await resResponse.json();
            const todayReservations = reservationsCache.filter(r => r.reserve_date === currentFilterDate);
            updateSidebarLists(todayReservations);
            
            // Fetch queue state for active display
            const queueResponse = await fetch('/api/queue');
            if (queueResponse.ok) {
                const queueState = await queueResponse.json();
                
                const callNumEl = document.getElementById('call-num');
                const callNameEl = document.getElementById('call-name');
                
                if (queueState.last_called_ticket) {
                    const ticketNum = queueState.last_called_ticket;
                    const updatedAt = queueState.updated_at; // Timestamp dari DB
                    
                    // Find name
                    const servingQueue = todayReservations.find(r => r.ticket_number === ticketNum);
                    const name = servingQueue ? servingQueue.full_name : 'Pemohon';
                    
                    // Trigger notifikasi jika nomor ATAU timestamp berubah (mendukung panggil ulang)
                    if (lastCalledTicketNum !== ticketNum || lastCalledTimestamp !== updatedAt) {
                        lastCalledTicketNum = ticketNum;
                        lastCalledTimestamp = updatedAt;
                        
                        if (callNumEl) callNumEl.innerText = ticketNum;
                        if (callNameEl) callNameEl.innerText = name;
                        
                        triggerCallNotification(ticketNum, name);
                    }
                } else {
                    lastCalledTicketNum = null;
                    lastCalledTimestamp = null;
                    if (callNumEl) callNumEl.innerText = 'A-000';
                    if (callNameEl) callNameEl.innerText = 'Mempersiapkan Antrean...';
                }
            }
        }
    } catch (e) {
        // Silent catch for API polling
    }
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
    
    osc1.type = 'triangle'; 
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
    
    gain1.gain.setValueAtTime(0, ctx.currentTime);
    gain1.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.6);
    
    // Play Note 2: C5 (523.25 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(523.25, ctx.currentTime + 0.35);
    
    gain2.gain.setValueAtTime(0, ctx.currentTime + 0.35);
    gain2.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.4); 
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.95);
    
    osc2.start(ctx.currentTime + 0.35);
    osc2.stop(ctx.currentTime + 0.95);
}

// 4. Indonesian Queue Voice TTS Panggilan
function speakQueueCall(queueNumber, name) {
    if (!('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    
    const rawNum = queueNumber.split('-')[1];
    const spokenDigits = rawNum.split('').map(digit => {
        if (digit === '0') return 'nol';
        return digit;
    }).join(' ');
    
    const text = `Antrean nomor A, ${spokenDigits}, atas nama ${name}, silakan menuju loket layanan utama.`;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 0.85; 
    utterance.pitch = 1.0;
    
    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find(voice => voice.lang.includes('id') || voice.lang.includes('ID'));
    if (idVoice) {
        utterance.voice = idVoice;
    }
    
    window.speechSynthesis.speak(utterance);
}

function triggerCallNotification(queueNumber, name) {
    const mainCard = document.querySelector('.main-call-card');
    if (mainCard) {
        mainCard.classList.remove('pulse-alert');
        void mainCard.offsetWidth; 
        mainCard.classList.add('pulse-alert');
    }
    
    playChimeTone();
    
    setTimeout(() => {
        speakQueueCall(queueNumber, name);
    }, 950);
}

// 5. Sidebar Lists Render (Upcoming & Completed)
function updateSidebarLists(todayReservations) {
    // Upcoming list
    const upcomingListEl = document.getElementById('upcoming-list');
    const waitingList = todayReservations
        .filter(r => r.status.toLowerCase() === 'menunggu')
        .sort((a, b) => {
            const numA = parseInt(a.ticket_number.split('-')[1]);
            const numB = parseInt(b.ticket_number.split('-')[1]);
            return numA - numB;
        });

    if (upcomingListEl) {
        upcomingListEl.innerHTML = '';
        if (waitingList.length === 0) {
            upcomingListEl.innerHTML = '<li class="sidebar-list-item text-center text-muted">Tidak ada antrean tunggu</li>';
        } else {
            waitingList.slice(0, 4).forEach(res => {
                const li = document.createElement('li');
                li.className = 'sidebar-list-item';
                li.innerHTML = `
                    <span class="sidebar-item-num">${res.ticket_number}</span>
                    <span class="sidebar-item-name">${res.full_name}</span>
                `;
                upcomingListEl.appendChild(li);
            });
        }
    }

    // Completed list
    const completedListEl = document.getElementById('completed-list');
    const completedList = todayReservations
        .filter(r => r.status.toLowerCase() === 'selesai')
        .sort((a, b) => {
            const numA = parseInt(a.ticket_number.split('-')[1]);
            const numB = parseInt(b.ticket_number.split('-')[1]);
            return numB - numA; 
        });

    if (completedListEl) {
        completedListEl.innerHTML = '';
        if (completedList.length === 0) {
            completedListEl.innerHTML = '<li class="sidebar-list-item text-center text-muted">Belum ada antrean selesai</li>';
        } else {
            completedList.slice(0, 4).forEach(res => {
                const li = document.createElement('li');
                li.className = 'sidebar-list-item';
                li.innerHTML = `
                    <span class="sidebar-item-num completed">${res.ticket_number}</span>
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

setInterval(nextSlide, 10000);
