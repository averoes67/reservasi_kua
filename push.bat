@echo off
echo ==========================================
echo    Auto Push ke GitHub ^& Cloudflare Pages
echo ==========================================
echo.

:: 1. Menambahkan semua perubahan file
git add .

:: 2. Meminta pesan update dari Anda
set /p commit_msg="Ketik perubahan apa yang Anda buat (Enter untuk default 'Update'): "
if "%commit_msg%"=="" set commit_msg=Update file website

:: 3. Membungkus perubahan (Commit)
git commit -m "%commit_msg%"

:: 4. Mengirim ke GitHub
echo.
echo Mengirim ke GitHub...
git push origin main
:: Jika Anda memakai branch 'master', ganti 'main' di atas menjadi 'master'

echo.
echo ==========================================
echo BERHASIL! 
echo Cloudflare sedang membangun ulang website Anda.
echo Website akan terupdate otomatis dalam 1-2 menit.
echo ==========================================
pause
