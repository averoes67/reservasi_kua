/* ==========================================================================
   ADMIN JAVASCRIPT - admin.js
   Logic for Admin Login, Session Management, TTS, and Database Control
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Check if operator is already logged in
    checkSession();

    // Set default filter date to today
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayString = `${yyyy}-${mm}-${dd}`;
    
    const adminDateFilter = document.getElementById('admin-date-filter');
    if (adminDateFilter) {
        adminDateFilter.value = todayString;
    }

    // Initialize Database in LocalStorage if not exists
    if (!localStorage.getItem('reservations')) {
        localStorage.setItem('reservations', JSON.stringify([]));
    }

    // Load initial table & stats if session is active
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        renderAdminTable();
        updateAdminStats();
    }

    // Trigger loading voices for browser TTS
    if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
    }
});

// 1. Session and Authentication Management
function checkSession() {
    const isLoggedIn = sessionStorage.getItem('adminLoggedIn') === 'true';
    const loginSection = document.getElementById('section-login');
    const adminSection = document.getElementById('section-admin');
    const adminNav = document.getElementById('admin-nav');

    if (isLoggedIn) {
        if (loginSection) loginSection.classList.add('hidden');
        if (adminSection) adminSection.classList.remove('hidden');
        if (adminNav) adminNav.classList.remove('hidden');
        renderAdminTable();
        updateAdminStats();
    } else {
        if (loginSection) loginSection.classList.remove('hidden');
        if (adminSection) adminSection.classList.add('hidden');
        if (adminNav) adminNav.classList.add('hidden');
    }
}

function handleLoginSubmit(event) {
    event.preventDefault();
    
    const usernameInput = document.getElementById('username').value.trim();
    const passwordInput = document.getElementById('password').value;
    const errorMsg = document.getElementById('login-error-msg');
    
    // Default hardcoded credential
    if (usernameInput === 'admin' && passwordInput === 'admin123') {
        sessionStorage.setItem('adminLoggedIn', 'true');
        if (errorMsg) errorMsg.classList.add('hidden');
        document.getElementById('login-form').reset();
        checkSession();
    } else {
        if (errorMsg) errorMsg.classList.remove('hidden');
    }
}

function handleLogout() {
    sessionStorage.removeItem('adminLoggedIn');
    window.location.href = 'index.html';
}

// Helper: Get reservations array from LocalStorage
function getReservations() {
    return JSON.parse(localStorage.getItem('reservations')) || [];
}

// Helper: Save reservations array to LocalStorage
function saveReservations(data) {
    localStorage.setItem('reservations', JSON.stringify(data));
}

// 2. Admin Queue Management Controls

// Render table entries based on selected date
function renderAdminTable() {
    const tableBody = document.getElementById('admin-table-body');
    const filterDate = document.getElementById('admin-date-filter').value;
    
    if (!tableBody) return;
    tableBody.innerHTML = '';
    
    const reservations = getReservations();
    const filtered = reservations.filter(r => r.reservation_date === filterDate);
    
    // Sort chronologically by queue number (A-001, A-002, ...)
    filtered.sort((a, b) => {
        const numA = parseInt(a.queue_number.split('-')[1]);
        const numB = parseInt(b.queue_number.split('-')[1]);
        return numA - numB;
    });
    
    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">Belum ada antrean terdaftar pada tanggal ini.</td>
            </tr>
        `;
        return;
    }
    
    filtered.forEach(res => {
        let statusBadge = '';
        if (res.status === 'waiting') statusBadge = '<span class="badge badge-waiting">Menunggu</span>';
        else if (res.status === 'serving') statusBadge = '<span class="badge badge-serving">Melayani</span>';
        else if (res.status === 'completed') statusBadge = '<span class="badge badge-completed">Selesai</span>';
        else if (res.status === 'cancelled') statusBadge = '<span class="badge badge-cancelled">Batal</span>';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td data-label="No. Antrean"><strong>${res.queue_number}</strong></td>
            <td data-label="Nama Lengkap">${res.full_name}</td>
            <td data-label="No. WhatsApp">${res.phone_number}</td>
            <td data-label="Sesi Waktu">${res.time_slot}</td>
            <td data-label="Tujuan Layanan">${res.purpose}</td>
            <td data-label="Status">${statusBadge}</td>
            <td>
                <div class="action-group">
                    <button class="action-btn call" title="Panggil Antrean" onclick="callTargetQueue('${res.id}')">
                        <i class="fa-solid fa-volume-high"></i>
                    </button>
                    <button class="action-btn complete" title="Tandai Selesai" onclick="changeQueueStatus('${res.id}', 'completed')">
                        <i class="fa-solid fa-check"></i>
                    </button>
                    <button class="action-btn cancel" title="Batalkan Antrean" onclick="changeQueueStatus('${res.id}', 'cancelled')">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Update Admin Info Cards
function updateAdminStats() {
    const filterDate = document.getElementById('admin-date-filter').value;
    const reservations = getReservations().filter(r => r.reservation_date === filterDate);
    
    const total = reservations.length;
    const servingRes = reservations.find(r => r.status === 'serving');
    const waiting = reservations.filter(r => r.status === 'waiting').length;
    
    const statTotal = document.getElementById('stat-total');
    const statServing = document.getElementById('stat-serving');
    const statWaiting = document.getElementById('stat-waiting');
    
    const currentCallNum = document.getElementById('current-call-num');
    const currentCallName = document.getElementById('current-call-name');
    
    if (statTotal) statTotal.innerText = total;
    if (statWaiting) statWaiting.innerText = waiting;
    
    if (servingRes) {
        if (statServing) statServing.innerText = servingRes.queue_number;
        if (currentCallNum) currentCallNum.innerText = servingRes.queue_number;
        if (currentCallName) currentCallName.innerText = servingRes.full_name;
    } else {
        if (statServing) statServing.innerText = '-';
        if (currentCallNum) currentCallNum.innerText = 'A-000';
        if (currentCallName) currentCallName.innerText = 'Tidak ada antrean sedang dilayani';
    }
}

// Update status and voice out for target reservation
function callTargetQueue(id) {
    const reservations = getReservations();
    const res = reservations.find(r => r.id === id);
    if (!res) return;
    
    // Auto-complete previous serving ones for today
    reservations.forEach(r => {
        if (r.reservation_date === res.reservation_date && r.status === 'serving') {
            r.status = 'completed';
        }
    });
    
    // Set this one to active serving
    res.status = 'serving';
    saveReservations(reservations);
    
    // Broadcast call event to display.html
    localStorage.setItem('lastCalledTicket', JSON.stringify({
        id: res.id,
        queue_number: res.queue_number,
        full_name: res.full_name,
        timestamp: Date.now()
    }));
    
    // Redraw table and stats
    renderAdminTable();
    updateAdminStats();
}

// Call next waiting queue
function callNextQueue() {
    const filterDate = document.getElementById('admin-date-filter').value;
    const reservations = getReservations();
    
    const waitingList = reservations
        .filter(r => r.reservation_date === filterDate && r.status === 'waiting')
        .sort((a, b) => {
            const numA = parseInt(a.queue_number.split('-')[1]);
            const numB = parseInt(b.queue_number.split('-')[1]);
            return numA - numB;
        });
        
    if (waitingList.length === 0) {
        alert('Tidak ada antrean berikutnya yang menunggu.');
        return;
    }
    
    const nextQueue = waitingList[0];
    callTargetQueue(nextQueue.id);
}

// Re-speak the current serving queue voice
function recallCurrentQueue() {
    const filterDate = document.getElementById('admin-date-filter').value;
    const reservations = getReservations();
    const servingRes = reservations.find(r => r.reservation_date === filterDate && r.status === 'serving');
    
    if (servingRes) {
        // Broadcast call event to display.html
        localStorage.setItem('lastCalledTicket', JSON.stringify({
            id: servingRes.id,
            queue_number: servingRes.queue_number,
            full_name: servingRes.full_name,
            timestamp: Date.now()
        }));
    } else {
        alert('Tidak ada antrean aktif yang sedang dilayani untuk dipanggil.');
    }
}

// Switch status (e.g. mark complete or cancel)
function changeQueueStatus(id, status) {
    const reservations = getReservations();
    const res = reservations.find(r => r.id === id);
    if (!res) return;
    
    res.status = status;
    saveReservations(reservations);
    
    renderAdminTable();
    updateAdminStats();
}

// Reset localStorage data
function clearAllData() {
    if (confirm('Apakah Anda yakin ingin menghapus semua data antrean? Tindakan ini tidak dapat dibatalkan.')) {
        saveReservations([]);
        renderAdminTable();
        updateAdminStats();
        alert('Database antrean berhasil dikosongkan.');
    }
}

// TTS Voice Engine Call
function voiceOutQueue(queueNumber, name) {
    if ('speechSynthesis' in window) {
        // Stop current speech
        window.speechSynthesis.cancel();
        
        // Convert digits for better spelling, e.g. A-005 to 'A, nol, nol, lima'
        const rawNum = queueNumber.split('-')[1];
        const spokenDigits = rawNum.split('').map(digit => {
            if (digit === '0') return 'nol';
            return digit;
        }).join(' ');
        
        const text = `Antrean nomor A, ${spokenDigits}, atas nama ${name}, silakan menuju loket pendaftaran.`;
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'id-ID';
        utterance.rate = 0.85; // Natural clear pace
        utterance.pitch = 1.0;
        
        // Select Indonesian local voice
        const voices = window.speechSynthesis.getVoices();
        const idVoice = voices.find(voice => voice.lang.includes('id') || voice.lang.includes('ID'));
        if (idVoice) {
            utterance.voice = idVoice;
        }
        
        window.speechSynthesis.speak(utterance);
    }
}

// Inject sample data for testing
function loadSampleData() {
    const filterDate = document.getElementById('admin-date-filter').value;
    const sampleNames = ['Rian Hidayat', 'Aisyah Putri', 'Budi Santoso', 'Siti Aminah', 'Dewi Lestari'];
    const samplePhones = ['081234567890', '089876543210', '085678912345', '082134567890', '087812345678'];
    const samplePurposes = ['Pendaftaran Nikah / Rujuk', 'Rekomendasi Nikah (Numpang Nikah)', 'Konsultasi Keluarga & Syariah', 'Legalisir & Pengambilan Buku Nikah', 'Pendaftaran Nikah / Rujuk'];
    const sampleTimes = ['Sesi Pagi (08:00 - 11:00)', 'Sesi Pagi (08:00 - 11:00)', 'Sesi Siang (13:00 - 16:00)', 'Sesi Siang (13:00 - 16:00)', 'Sesi Siang (13:00 - 16:00)'];
    
    const reservations = getReservations();
    
    // Clean old records for this filter date to prevent numbers collisions
    const cleanedReservations = reservations.filter(r => r.reservation_date !== filterDate);
    
    // Inject 5 mock entries
    for (let i = 0; i < 5; i++) {
        cleanedReservations.push({
            id: 'mock_' + i + '_' + Date.now(),
            queue_number: `A-${String(i + 1).padStart(3, '0')}`,
            full_name: sampleNames[i],
            phone_number: samplePhones[i],
            reservation_date: filterDate,
            time_slot: sampleTimes[i],
            purpose: samplePurposes[i],
            status: i === 0 ? 'serving' : 'waiting', // A-001 serving, rest waiting
            created_at: new Date().toISOString()
        });
    }
    
    saveReservations(cleanedReservations);
    renderAdminTable();
    updateAdminStats();
    alert('Data sampel berhasil ditambahkan untuk tanggal ' + filterDate + '.');
}

// --- Penghulu Quota Logic ---
function initQuota() {
    let quota = localStorage.getItem('kua_nikah_quota');
    if(!quota) {
        quota = 5;
        localStorage.setItem('kua_nikah_quota', quota);
    }
    const quotaInput = document.getElementById('kuotaPenghulu');
    if(quotaInput) quotaInput.value = quota;
}

function saveQuota() {
    const quotaInput = document.getElementById('kuotaPenghulu');
    const msg = document.getElementById('quota-msg');
    if(quotaInput && msg) {
        localStorage.setItem('kua_nikah_quota', quotaInput.value);
        msg.textContent = 'Kuota berhasil disimpan!';
        setTimeout(() => msg.textContent = '', 3000);
    }
}

// Initialize quota on load
document.addEventListener('DOMContentLoaded', () => {
    initQuota();
});
