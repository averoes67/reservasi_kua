/* ==========================================================================
   PUBLIC JAVASCRIPT - app.js
   Logic for Reservation & Digital Ticket creation
   ========================================================================== */

let currentActiveTicket = null;

document.addEventListener('DOMContentLoaded', () => {
    // Set default and min date to today
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayString = `${yyyy}-${mm}-${dd}`;
    
    const reserveDateInput = document.getElementById('reserveDate');
    if (reserveDateInput) {
        reserveDateInput.value = todayString;
        reserveDateInput.min = todayString;
    }

    // Initialize Database in LocalStorage if not exists
    if (!localStorage.getItem('reservations')) {
        localStorage.setItem('reservations', JSON.stringify([]));
    }
});

// Helper: Get reservations array from LocalStorage
function getReservations() {
    return JSON.parse(localStorage.getItem('reservations')) || [];
}

// Helper: Save reservations array to LocalStorage
function saveReservations(data) {
    localStorage.setItem('reservations', JSON.stringify(data));
}

// Queue Generation & Form Submission
function handleFormSubmit(event) {
    event.preventDefault();
    
    const fullName = document.getElementById('fullName').value.trim();
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    const reserveDate = document.getElementById('reserveDate').value;
    const timeSlot = document.getElementById('timeSlot').value;
    let purpose = document.getElementById('purpose').value;
    if (purpose === 'Lainnya') {
        purpose = document.getElementById('customPurpose').value.trim();
        if (!purpose) {
            alert('Mohon ketik tujuan layanan Anda.');
            return;
        }
    }
    
    if (!fullName || !phoneNumber || !reserveDate || !timeSlot || !purpose) {
        alert('Mohon lengkapi semua kolom formulir.');
        return;
    }

    const reservations = getReservations();
    
    // Generate next queue number for the selected date
    const dateReservations = reservations.filter(r => r.reservation_date === reserveDate);
    let nextNum = 1;
    
    if (dateReservations.length > 0) {
        // Extract queue numbers and find maximum
        const nums = dateReservations.map(r => {
            const match = r.queue_number.match(/A-(\d+)/);
            return match ? parseInt(match[1], 10) : 0;
        });
        nextNum = Math.max(...nums) + 1;
    }
    
    const queueNumber = `A-${String(nextNum).padStart(3, '0')}`;
    
    // Create new reservation object
    const newReservation = {
        id: 'res_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now(),
        queue_number: queueNumber,
        full_name: fullName,
        phone_number: phoneNumber,
        reservation_date: reserveDate,
        time_slot: timeSlot,
        purpose: purpose,
        status: 'waiting', // waiting, serving, completed, cancelled
        created_at: new Date().toISOString()
    };
    
    // Save to LocalStorage
    reservations.push(newReservation);
    saveReservations(reservations);
    
    // Show digital ticket
    displayTicket(newReservation);
}

// Digital Ticket Display & Operations
function displayTicket(reservation) {
    currentActiveTicket = reservation;
    
    // Populate text content
    document.getElementById('ticket-queue-number').innerText = reservation.queue_number;
    document.getElementById('ticket-name').innerText = reservation.full_name;
    document.getElementById('ticket-purpose').innerText = reservation.purpose;
    
    // Format date Indonesian Style (e.g. 10 Agustus 2026)
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = new Date(reservation.reservation_date).toLocaleDateString('id-ID', options);
    document.getElementById('ticket-date').innerText = formattedDate;
    
    document.getElementById('ticket-time').innerText = reservation.time_slot;
    
    // Draw Mock Barcode
    const barcodeCanvas = document.getElementById('barcode-canvas');
    drawMockBarcode(barcodeCanvas, reservation.queue_number);
    
    // Toggle screens & update stepper
    document.getElementById('section-booking').classList.add('hidden');
    document.getElementById('section-ticket').classList.remove('hidden');
    
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    if (step1 && step2) {
        step1.classList.remove('active');
        step1.classList.add('completed');
        step2.classList.add('active');
    }
}

// Helper: Drawing a barcode styled pattern in canvas
function drawMockBarcode(canvas, text) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    
    // Reset canvas with white bg
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    
    // Draw code lines (black)
    ctx.fillStyle = '#000000';
    let x = 15;
    const endX = w - 15;
    
    // Seed generator with queue text
    let seed = 0;
    for (let i = 0; i < text.length; i++) {
        seed += text.charCodeAt(i);
    }
    
    function seededRandom() {
        var x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }
    
    while (x < endX) {
        let barWidth = Math.floor(seededRandom() * 4) + 1; // 1 to 4 px wide
        let spacing = Math.floor(seededRandom() * 3) + 2;  // 2 to 4 px space
        
        ctx.fillRect(x, 5, barWidth, h - 20);
        x += barWidth + spacing;
    }
    
    // Draw numbers text underneath the barcode
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, w / 2, h - 5);
}

// Return to booking form and reset
function resetFormToNewBooking() {
    currentActiveTicket = null;
    document.getElementById('reservation-form').reset();
    
    // Re-initialize default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('reserveDate').value = today;
    
    // Show booking form, hide ticket & reset stepper
    document.getElementById('section-ticket').classList.add('hidden');
    document.getElementById('section-booking').classList.remove('hidden');
    
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    if (step1 && step2) {
        step1.classList.remove('completed');
        step1.classList.add('active');
        step2.classList.remove('active');
    }

    // Reset custom purpose input
    const customGroup = document.getElementById('custom-purpose-group');
    const customInput = document.getElementById('customPurpose');
    if (customGroup && customInput) {
        customGroup.classList.add('hidden');
        customInput.required = false;
        customInput.value = '';
    }
}

// Download Ticket as PNG using dynamic canvas drawing
function downloadTicket() {
    if (!currentActiveTicket) return;
    
    const canvas = document.getElementById('export-canvas');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Draw Background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);
    
    // Outer Border
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3;
    ctx.strokeRect(15, 15, width - 30, height - 30);
    
    // Inner ticket container card
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(30, 30, width - 60, height - 60);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(30, 30, width - 60, height - 60);
    
    // Top Batik Decorative Strip
    const topStripGrad = ctx.createLinearGradient(30, 30, width - 30, 30);
    topStripGrad.addColorStop(0, '#15803d');
    topStripGrad.addColorStop(0.3, '#16a34a');
    topStripGrad.addColorStop(0.5, '#facc15');
    topStripGrad.addColorStop(0.7, '#ca8a04');
    topStripGrad.addColorStop(1, '#15803d');
    ctx.fillStyle = topStripGrad;
    ctx.fillRect(30, 30, width - 60, 8);

    // Header Background
    const headerGrad = ctx.createLinearGradient(30, 38, width - 30, 110);
    headerGrad.addColorStop(0, '#16a34a');
    headerGrad.addColorStop(1, '#0f766e');
    ctx.fillStyle = headerGrad;
    ctx.fillRect(30, 38, width - 60, 75);
    
    // Logo Header
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 26px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('KUA', 60, 85);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '500 13px Inter, sans-serif';
    ctx.fillText('SISTEM ANTREAN RESMI', 125, 84);
    
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('MENUNGGU / WAITING', width - 60, 84);
    
    // Big Queue Number section
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NOMOR ANTREAN', width / 2, 165);
    
    // Main Huge digits
    const qNumGrad = ctx.createLinearGradient(width/2 - 100, 0, width/2 + 100, 0);
    qNumGrad.addColorStop(0, '#16a34a');
    qNumGrad.addColorStop(1, '#65a30d');
    ctx.fillStyle = qNumGrad;
    ctx.font = 'extrabold 92px Outfit, sans-serif';
    ctx.fillText(currentActiveTicket.queue_number, width / 2, 260);
    
    // Notch Divider
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(50, 305);
    ctx.lineTo(width - 50, 305);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Detail info columns
    ctx.textAlign = 'left';
    
    // Row 1: Nama & Layanan
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText('NAMA LENGKAP', 60, 355);
    ctx.fillText('LAYANAN', width / 2 + 30, 355);
    
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.fillText(currentActiveTicket.full_name, 60, 385);
    ctx.fillText(currentActiveTicket.purpose, width / 2 + 30, 385);
    
    // Row 2: Tanggal & Sesi
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText('TANGGAL KUNJUNGAN', 60, 455);
    ctx.fillText('SESI WAKTU', width / 2 + 30, 455);
    
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = new Date(currentActiveTicket.reservation_date).toLocaleDateString('id-ID', options);
    
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.fillText(formattedDate, 60, 485);
    ctx.fillText(currentActiveTicket.time_slot, width / 2 + 30, 485);
    
    // Barcode container box (card)
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.fillRect(width / 2 - 170, 550, 340, 110);
    ctx.strokeRect(width / 2 - 170, 550, 340, 110);
    
    // Barcode lines
    ctx.fillStyle = '#0f172a';
    let x = width / 2 - 145;
    const endX = width / 2 + 145;
    let seed = 123;
    function seededRandom() {
        var x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }
    
    while (x < endX) {
        let barWidth = Math.floor(seededRandom() * 4) + 1;
        let spacing = Math.floor(seededRandom() * 3) + 2;
        ctx.fillRect(x, 565, barWidth, 65);
        x += barWidth + spacing;
    }
    
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(currentActiveTicket.queue_number, width / 2, 648);
    
    // Footer notes
    ctx.fillStyle = '#ca8a04';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillText('*Harap datang 15 menit sebelum sesi dimulai', width / 2, 725);
    
    ctx.fillStyle = '#64748b';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText('Tunjukkan tiket digital ini kepada petugas di loket.', width / 2, 755);
    
    // Trigger download
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `Tiket-Antrian-${currentActiveTicket.queue_number}.png`;
    link.href = dataURL;
    link.click();
}

// Redirect and share details on WhatsApp
function shareToWhatsApp() {
    if (!currentActiveTicket) return;
    
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = new Date(currentActiveTicket.reservation_date).toLocaleDateString('id-ID', options);
    
    const message = `Halo, saya telah melakukan reservasi online di *KUA*.
Berikut adalah bukti nomor antrean saya:

*NOMOR ANTREAN:* ${currentActiveTicket.queue_number}
*Nama:* ${currentActiveTicket.full_name}
*Layanan:* ${currentActiveTicket.purpose}
*Tanggal:* ${formattedDate}
*Sesi:* ${currentActiveTicket.time_slot}

_Harap datang 15 menit sebelum sesi dimulai. Terima kasih._`;
    
    const encodedText = encodeURIComponent(message);
    const waUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    
    window.open(waUrl, '_blank');
}

// Define specific requirements for each KUA service
const kuaRequirements = {
    'Pendaftaran Nikah / Rujuk': [
        'Fotokopi KTP dan KK Calon Suami & Istri',
        'Fotokopi KTP dan KK Orang Tua / Wali',
        'Surat Pengantar dari Kelurahan (Model N1 - N4)',
        'Akta Cerai / Surat Kematian (jika berstatus Janda/Duda)',
        'Pas Foto 2x3 dan 4x6 (Masing-masing 4 lembar, background biru)'
    ],
    'Rekomendasi Nikah (Numpang Nikah)': [
        'Fotokopi KTP dan KK Pemohon',
        'Surat Pengantar RT/RW setempat',
        'Surat Keterangan Belum Menikah dari Kelurahan',
        'Fotokopi KTP Calon Pasangan'
    ],
    'Konsultasi Keluarga & Syariah': [
        'Kartu Identitas (KTP) Asli',
        'Buku Nikah (jika sudah menikah)',
        'Membawa berkas kronologi tertulis (jika diperlukan)'
    ],
    'Legalisir & Pengambilan Buku Nikah': [
        'Buku Nikah Asli (untuk Legalisir)',
        'Fotokopi Buku Nikah maksimal 5 rangkap',
        'KTP Asli / Surat Kuasa bermaterai (jika diwakilkan)'
    ]
};

// Handle purpose selection change: show/hide custom text input & trigger modal
function handlePurposeChange(selectObj) {
    const customGroup = document.getElementById('custom-purpose-group');
    const customInput = document.getElementById('customPurpose');
    const selectedValue = selectObj.value;

    if (customGroup && customInput) {
        if (selectedValue === 'Lainnya') {
            customGroup.classList.remove('hidden');
            customInput.required = true;
            customInput.focus();
        } else {
            customGroup.classList.add('hidden');
            customInput.required = false;
            customInput.value = '';
            
            // Show requirements modal if service has specific requirements
            if (kuaRequirements[selectedValue]) {
                showRequirementsModal(kuaRequirements[selectedValue]);
            }
        }
    }
}

function showRequirementsModal(requirements) {
    const modal = document.getElementById('requirementsModal');
    const reqList = document.getElementById('requirementsList');
    
    if (modal && reqList) {
        reqList.innerHTML = requirements.map(req => `<li><i class="fa-solid fa-circle-check text-primary" style="margin-right: 8px;"></i>${req}</li>`).join('');
        modal.classList.remove('hidden');
    }
}

function closeRequirementsModal() {
    const modal = document.getElementById('requirementsModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Reset form to initial booking state
function resetFormToNewBooking() {
    const form = document.getElementById('reservation-form');
    if (form) form.reset();
    
    // Reset date to today
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayString = `${yyyy}-${mm}-${dd}`;
    const reserveDateInput = document.getElementById('reserveDate');
    if (reserveDateInput) {
        reserveDateInput.value = todayString;
        reserveDateInput.min = todayString;
    }
    
    // Hide custom purpose input
    const customGroup = document.getElementById('custom-purpose-group');
    const customInput = document.getElementById('customPurpose');
    if (customGroup && customInput) {
        customGroup.classList.add('hidden');
        customInput.required = false;
        customInput.value = '';
    }
    
    // Switch views
    const sectionTicket = document.getElementById('section-ticket');
    const sectionBooking = document.getElementById('section-booking');
    if (sectionTicket && sectionBooking) {
        sectionTicket.classList.add('hidden');
        sectionBooking.classList.remove('hidden');
    }
    
    // Reset stepper
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    if (step1 && step2) {
        step1.classList.add('active');
        step1.classList.remove('completed');
        step2.classList.remove('active');
        step2.classList.remove('completed');
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
