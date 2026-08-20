/* ==========================================================================
   ADMIN JAVASCRIPT - admin.js
   Logic for Admin Login, Session Management, TTS, and Database Control
   ========================================================================== */

let globalReservations = []; // Cache to avoid excessive fetching if needed, but we'll fetch real-time.

document.addEventListener('DOMContentLoaded', () => {
    checkSession();

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayString = `${yyyy}-${mm}-${dd}`;
    
    const adminDateFilter = document.getElementById('admin-date-filter');
    if (adminDateFilter) {
        adminDateFilter.value = todayString;
    }

    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        fetchAndRenderData();
    }

    if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
    }
});

function checkSession() {
    const isLoggedIn = sessionStorage.getItem('adminLoggedIn') === 'true';
    const loginSection = document.getElementById('section-login');
    const adminSection = document.getElementById('section-admin');
    const adminNav = document.getElementById('admin-nav');

    if (isLoggedIn) {
        if (loginSection) loginSection.classList.add('hidden');
        if (adminSection) adminSection.classList.remove('hidden');
        if (adminNav) adminNav.classList.remove('hidden');
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
    
    if (usernameInput === 'admin' && passwordInput === 'admin123') {
        sessionStorage.setItem('adminLoggedIn', 'true');
        if (errorMsg) errorMsg.classList.add('hidden');
        document.getElementById('login-form').reset();
        checkSession();
        fetchAndRenderData();
    } else {
        if (errorMsg) errorMsg.classList.remove('hidden');
    }
}

function handleLogout() {
    sessionStorage.removeItem('adminLoggedIn');
    window.location.href = 'index.html';
}

// Fetch data from API
async function fetchAndRenderData() {
    try {
        const response = await fetch('/api/reservations');
        if (!response.ok) throw new Error('Network response was not ok');
        const reservations = await response.json();
        globalReservations = reservations;
        renderAdminTable(reservations);
        updateAdminStats(reservations);
    } catch (error) {
        console.error('Error fetching reservations:', error);
        // Fallback for local testing without Wrangler
        if(window.location.hostname === 'localhost' || window.location.protocol === 'file:') {
           console.warn("API D1 tidak berjalan. Tampilkan mock data?");
        }
    }
}

function renderAdminTable(reservations) {
    const tableBody = document.getElementById('admin-table-body');
    const filterDate = document.getElementById('admin-date-filter').value;
    
    if (!tableBody) return;
    tableBody.innerHTML = '';
    
    const filtered = reservations.filter(r => r.reserve_date === filterDate);
    
    // Sort chronologically
    filtered.sort((a, b) => {
        const numA = parseInt(a.ticket_number.split('-')[1]);
        const numB = parseInt(b.ticket_number.split('-')[1]);
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
        const stat = res.status.toLowerCase();
        if (stat === 'menunggu') statusBadge = '<span class="badge badge-waiting">Menunggu</span>';
        else if (stat === 'dipanggil') statusBadge = '<span class="badge badge-serving">Melayani</span>';
        else if (stat === 'selesai') statusBadge = '<span class="badge badge-completed">Selesai</span>';
        else if (stat === 'batal') statusBadge = '<span class="badge badge-cancelled">Batal</span>';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td data-label="No. Antrean"><strong>${res.ticket_number}</strong></td>
            <td data-label="Nama Lengkap">${res.full_name}</td>
            <td data-label="No. WhatsApp">${res.phone_number}</td>
            <td data-label="Sesi Waktu">${res.time_slot}</td>
            <td data-label="Tujuan Layanan">${res.purpose}</td>
            <td data-label="Status">${statusBadge}</td>
            <td>
                <div class="action-group">
                    <button class="action-btn call" title="Panggil Antrean" onclick="callTargetQueue('${res.ticket_number}')">
                        <i class="fa-solid fa-volume-high"></i>
                    </button>
                    <button class="action-btn complete" title="Tandai Selesai" onclick="changeQueueStatus('${res.ticket_number}', 'complete')">
                        <i class="fa-solid fa-check"></i>
                    </button>
                    <button class="action-btn cancel" title="Batalkan Antrean" onclick="changeQueueStatus('${res.ticket_number}', 'cancel')">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function updateAdminStats(reservations) {
    const filterDate = document.getElementById('admin-date-filter').value;
    const filtered = reservations.filter(r => r.reserve_date === filterDate);
    
    const total = filtered.length;
    const waiting = filtered.filter(r => r.status.toLowerCase() === 'menunggu').length;
    const serving = filtered.filter(r => r.status.toLowerCase() === 'dipanggil').length;
    const completed = filtered.filter(r => r.status.toLowerCase() === 'selesai').length;
    
    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-waiting').innerText = waiting;
    document.getElementById('stat-serving').innerText = serving;
    document.getElementById('stat-completed').innerText = completed;
}

async function callTargetQueue(ticketNumber) {
    // We assume counter 1 for now (Multi-loket will change this later)
    try {
        const response = await fetch('/api/queue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'call',
                ticket_number: ticketNumber,
                counter_number: 1
            })
        });
        
        if(response.ok) {
            // refresh data
            fetchAndRenderData();
        } else {
            alert("Gagal memanggil antrean.");
        }
    } catch(e) {
        console.error(e);
    }
}

async function changeQueueStatus(ticketNumber, action) {
    try {
        const response = await fetch('/api/queue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: action,
                ticket_number: ticketNumber
            })
        });
        
        if(response.ok) {
            fetchAndRenderData();
        } else {
            alert("Gagal memperbarui status.");
        }
    } catch(e) {
        console.error(e);
    }
}

async function callNextQueue() {
    const filterDate = document.getElementById('admin-date-filter').value;
    // Get from global cache
    const waitingList = globalReservations
        .filter(r => r.reserve_date === filterDate && r.status.toLowerCase() === 'menunggu')
        .sort((a, b) => {
            const numA = parseInt(a.ticket_number.split('-')[1]);
            const numB = parseInt(b.ticket_number.split('-')[1]);
            return numA - numB;
        });
        
    if (waitingList.length === 0) {
        alert('Tidak ada antrean berikutnya yang menunggu.');
        return;
    }
    
    callTargetQueue(waitingList[0].ticket_number);
}

function recallCurrentQueue() {
    const filterDate = document.getElementById('admin-date-filter').value;
    const servingRes = globalReservations.find(r => r.reserve_date === filterDate && r.status.toLowerCase() === 'dipanggil');
    
    if (servingRes) {
        // Ping API or just send local event for TV if not using websockets?
        // TV display will poll, so we can just re-save to queue.
        callTargetQueue(servingRes.ticket_number); 
    } else {
        alert('Tidak ada antrean aktif yang sedang dilayani untuk dipanggil.');
    }
}

// Clear all data (For D1 we might want a new endpoint, but for now we skip this for safety)
function clearAllData() {
    alert("Penghapusan data di D1 dinonaktifkan di antarmuka ini untuk keamanan.");
}

function loadSampleData() {
    alert("Sample data generator perlu disesuaikan dengan API D1.");
}
