#Website Reservasi & Antrean Online

Aplikasi reservasi online dengan sistem nomor antrean digital yang elegan, modern, dan interaktif. Dibuat menggunakan HTML, CSS murni (Glassmorphism Dark Mode), dan JavaScript tanpa memerlukan server terpisah (serverless dengan LocalStorage).

## 🚀 Fitur Utama
1. **Pendaftaran Reservasi**: Form pengisian data diri (Nama, No. WhatsApp, Tanggal, Sesi Waktu, Keperluan).
2. **Tiket Digital Premium**: Tiket bergaya *Boarding Pass* yang mencakup nomor antrean berkode unik (misal: `A-001`).
3. **Ekspor PNG Tiket**: Pengguna dapat mengunduh tiket digital secara langsung ke galeri gawai mereka dalam format PNG.
4. **Berbagi WhatsApp**: Membagikan bukti nomor antrean langsung ke kontak WhatsApp pribadi.
5. **Dashboard Admin**:
   - Statistik real-time (Total Antrean, Sedang Dilayani, Menunggu).
   - Fitur memanggil antrean berikutnya terintegrasi dengan **Text-to-Speech (Suara Manusia)** berbahasa Indonesia untuk memanggil nama dan nomor antrean.
   - Manajemen database antrean (hapus data, generate data contoh).

## 📂 Struktur File Proyek
- `index.html`: Struktur kerangka halaman utama.
- `style.css`: Desain visual Glassmorphism, efek neon, transisi halus, dan tata letak responsif.
- `app.js`: Logika antrean, penyimpanan lokal, penggambaran barcode, ekspor gambar, dan audio.

## 🛠️ Cara Menjalankan Proyek
1. Buka folder ini di komputer Anda.
2. Klik ganda (double-click) pada file `index.html` untuk langsung membukanya di peramban web (Google Chrome, Microsoft Edge, Safari, dll).
3. **Saran**: Jika menggunakan VS Code, Anda juga bisa menjalankannya menggunakan ekstensi *Live Server* agar perubahan kode dapat langsung terlihat di browser secara dinamis.

---
*Dibuat untuk mempermudah alur reservasi digital dengan visual premium.*
