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
    
    // Inisialisasi Custom Select (Dropdown dengan scroll)
    initializeCustomSelects();
});

// Custom Select Implementation
function initializeCustomSelects() {
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
        if (select.nextElementSibling && select.nextElementSibling.classList.contains('custom-select-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select-wrapper';
        
        select.style.display = 'none';
        
        const trigger = document.createElement('div');
        trigger.className = 'custom-select-trigger';
        const selectedOption = select.options[select.selectedIndex];
        trigger.innerHTML = `<span>${selectedOption ? selectedOption.text : 'Pilih...'}</span><i class="fa-solid fa-chevron-down"></i>`;
        
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'custom-select-options';
        
        Array.from(select.options).forEach(option => {
            if (option.disabled && option.value === '') return;
            
            const optionDiv = document.createElement('div');
            optionDiv.className = 'custom-select-option';
            optionDiv.innerText = option.text;
            optionDiv.dataset.value = option.value;
            
            optionDiv.addEventListener('click', () => {
                select.value = option.value;
                const event = new Event('change');
                select.dispatchEvent(event);
                
                trigger.querySelector('span').innerText = option.text;
                wrapper.classList.remove('open');
            });
            
            optionsContainer.appendChild(optionDiv);
        });
        
        wrapper.appendChild(trigger);
        wrapper.appendChild(optionsContainer);
        select.parentNode.insertBefore(wrapper, select.nextSibling);
        
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.custom-select-wrapper').forEach(w => {
                if (w !== wrapper) w.classList.remove('open');
            });
            wrapper.classList.toggle('open');
        });
    });

    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select-wrapper').forEach(w => {
            w.classList.remove('open');
        });
    });
}

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
    
    // Trigger download optimized for Mobile & Desktop
    if (canvas.toBlob) {
        canvas.toBlob((blob) => {
            if (!blob) {
                fallbackDownloadDataURL(canvas, `Tiket-Antrian-${currentActiveTicket.queue_number}.png`);
                return;
            }

            const fileName = `Tiket-Antrian-${currentActiveTicket.queue_number}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });

            // 1. Try Mobile Web Share API first if supported with files
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({
                    title: `Tiket Antrean ${currentActiveTicket.queue_number}`,
                    text: `Tiket Antrean Digital KUA ${currentActiveTicket.queue_number} atas nama ${currentActiveTicket.full_name}`,
                    files: [file]
                }).catch(() => {
                    triggerBlobDownload(blob, fileName);
                });
                return;
            }

            // 2. Blob Download for Mobile & Desktop
            triggerBlobDownload(blob, fileName);
        }, 'image/png');
    } else {
        fallbackDownloadDataURL(canvas, `Tiket-Antrian-${currentActiveTicket.queue_number}.png`);
    }
}

// Trigger Blob File Download
function triggerBlobDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show Mobile Save Modal Helper
    showMobileSaveImageModal(url);
}

// Fallback Data URL Download
function fallbackDownloadDataURL(canvas, fileName) {
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showMobileSaveImageModal(dataURL);
}

// Show helper modal for saving image on mobile devices
function showMobileSaveImageModal(imgSrc) {
    const modal = document.getElementById('ticketImageModal');
    const imgEl = document.getElementById('ticket-preview-img');
    const linkEl = document.getElementById('ticket-preview-open-link');

    if (modal && imgEl) {
        imgEl.src = imgSrc;
        if (linkEl) linkEl.href = imgSrc;
        modal.classList.remove('hidden');
    }
}

function closeTicketImageModal() {
    const modal = document.getElementById('ticketImageModal');
    if (modal) {
        modal.classList.add('hidden');
    }
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
        'Surat Pengantar Nikah dari Kepala Desa / Kelurahan (Model N1 - N4)',
        'Fotokopi KTP Calon Suami (CAMI), Calon Istri (CATRI), dan Orang Tua CAMI-CATRI',
        'Fotokopi Kartu Keluarga (KK) CAMI & CATRI',
        'Fotokopi Akta Kelahiran dan Ijazah Terakhir',
        'Pasfoto ukuran 2x3 masing-masing 6 lembar (Background Biru)',
        'Fotokopi KTP 2 orang saksi dalam pernikahan',
        'Surat Rekomendasi Nikah (Bagi CAMI/CATRI dari luar kecamatan)',
        'Nomor HP (WhatsApp) dan Email masing-masing CAMI-CATRI',
        'Akta Cerai dari Pengadilan Agama (Jika Cerai Hidup)',
        'Akta Kematian dari Disdukcapil (Jika Cerai Mati)',
        'Surat Pernyataan Belum Pernah Menikah',
        'Surat Layak Kawin / Hasil Lab dari Dinas Kesehatan (Puskesmas)',
        'Surat Keterangan Belum Nikah (Jejaka / Perawan / Janda / Duda)'
    ],
    'Rekomendasi Nikah (Numpang Nikah)': [
        'Surat pengantar dari RT dan RW setempat.',
        'Formulir surat pengantar nikah dari kelurahan/desa (Model N1, N2, N4, dan N5).',
        'Fotokopi KTP dan Kartu Keluarga (KK) calon pengantin.',
        'Fotokopi Akta Kelahiran dan Ijazah terakhir.',
        'Fotokopi KTP orang tua atau wali.',
        'Surat pernyataan belum pernah menikah (jejaka/perawan) bermeterai Rp10.000.',
        'Pas foto latar belakang warna biru (ukuran 2x3 dan 3x4).',
        '[Tambahan] Akta Cerai asli (cerai hidup) atau Akta Kematian (cerai mati).',
        '[Tambahan] Surat izin komandan/atasan (bagi anggota TNI/POLRI).',
        '[Tambahan] Surat izin orang tua (di bawah 21 th) / dispensasi PA (di bawah 19 th).'
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
    ],
    'Pembuatan Duplikat Buku Nikah': [
        'Surat Keterangan Kehilangan dari Kepolisian Asli',
        'Fotokopi KTP dan Kartu Keluarga (KK)',
        'Fotokopi Buku Nikah yang hilang (jika ada)',
        'Pas foto latar belakang biru ukuran 2x3 (2 lembar)'
    ],
    'Bimbingan Perkawinan (Bimwin)': [
        'Bukti Pendaftaran Nikah dari KUA',
        'Fotokopi KTP Calon Suami dan Calon Istri'
    ],
    'Pendaftaran Ikrar Wakaf': [
        'Sertifikat Tanah Asli / Girik / Surat Kepemilikan Tanah',
        'Fotokopi KTP Wakif (Pemberi Wakaf) dan Nadzir (Penerima Wakaf)',
        'Fotokopi KTP 2 orang Saksi',
        'Surat Keterangan dari Kepala Desa/Kelurahan setempat'
    ],
    'Pembinaan Mualaf / Masuk Islam': [
        'Fotokopi KTP / Identitas Diri Asli',
        'Surat Pengantar dari RT/RW setempat',
        'Pas foto latar bebas ukuran 3x4 (3 lembar)',
        'Membawa Materai Rp10.000 (2 lembar)'
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
                showRequirementsModal(selectedValue, kuaRequirements[selectedValue]);
            }
        }
    }
}

function showRequirementsModal(purposeName, requirements) {
    const modal = document.getElementById('requirementsModal');
    const reqList = document.getElementById('requirementsList');
    const reqText = document.getElementById('requirementsText');
    const modalHeaderTitle = document.querySelector('#requirementsModal .modal-header h3');

    if (modal && reqList) {
        if (purposeName === 'Pendaftaran Nikah / Rujuk') {
            if (modalHeaderTitle) {
                modalHeaderTitle.innerHTML = `<i class="fa-solid fa-file-circle-check text-primary"></i> Persyaratan Nikah (PMA No. 30/2024)`;
            }
            if (reqText) {
                reqText.innerHTML = `<strong>Persyaratan Pendaftaran Kehendak Nikah berdasarkan PMA No 30 Tahun 2024:</strong><br><span class="text-muted" style="font-size: 0.85rem;">Harap siapkan dan bawa berkas berikut saat kunjungan ke KUA:</span>`;
            }
        } else {
            if (modalHeaderTitle) {
                modalHeaderTitle.innerHTML = `<i class="fa-solid fa-file-circle-check text-primary"></i> Persyaratan Layanan`;
            }
            if (reqText) {
                reqText.innerText = `Silakan lengkapi dokumen persyaratan berikut sebelum mendatangi kantor KUA:`;
            }
        }

        reqList.innerHTML = requirements.map((req, idx) => 
            `<li>
                <span class="req-num">${idx + 1}.</span>
                <span>${req}</span>
            </li>`
        ).join('');

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
    
    // Update custom selects UI
    document.querySelectorAll('select').forEach(select => {
        const wrapper = select.nextElementSibling;
        if (wrapper && wrapper.classList.contains('custom-select-wrapper')) {
            const triggerSpan = wrapper.querySelector('.custom-select-trigger span');
            const selectedOpt = select.options[select.selectedIndex];
            if (triggerSpan && selectedOpt) {
                triggerSpan.innerText = selectedOpt.text;
            }
        }
    });
    
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
