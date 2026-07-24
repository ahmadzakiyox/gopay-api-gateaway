#!/usr/bin/env bash
# =================================================================
# GoPay Merchant Gateway - Automated Setup Script (VPS & cPanel)
# =================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}"
echo "=========================================================="
echo "        GoPay Merchant Gateway - Setup Helper             "
echo "=========================================================="
echo -e "${NC}"

# 1. Cek versi Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js belum terinstall! Harap install Node.js (v18.x direkomendasikan).${NC}"
    exit 1
fi

NODE_VER=$(node -v)
echo -e "[INFO] Versi Node.js terdeteksi: ${YELLOW}${NODE_VER}${NC}"

NODE_MAJOR=$(node -v | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_MAJOR" -ge 20 ]; then
    echo -e "${YELLOW}[PERINGATAN] Anda menggunakan Node.js v20+.${NC}"
    echo -e "${YELLOW}Di cPanel Shared Hosting (CloudLinux), Node v20 dapat menyebabkan 'Out of Memory WebAssembly'.${NC}"
    echo -e "${YELLOW}Disarankan menurunkan versi Node.js ke 18.x jika menggunakan cPanel.${NC}\n"
fi

# 2. Copy .env dari template jika belum ada
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo -e "[INFO] Membuat file .env dari .env.example..."
        cp .env.example .env
        echo -e "${GREEN}[OK] File .env berhasil dibuat.${NC}"
    else
        echo -e "${YELLOW}[WARN] File .env.example tidak ditemukan, membuat .env baru...${NC}"
        cat <<EOT > .env
PORT=3000
API_KEY=cobadulu
QRIS_STATIC=
GOPAY_MERCHANT_ID=
EOT
        echo -e "${GREEN}[OK] File .env dibuat dengan konfigurasi default.${NC}"
    fi
else
    echo -e "[INFO] File .env sudah ada."
fi

# 3. Install Dependencies
echo -e "\n[INFO] Menginstall dependencies npm..."
npm install

echo -e "${GREEN}[OK] Dependencies berhasil diinstall.${NC}\n"

# 4. Opsi Jalankan Login OTP
echo -e "=========================================================="
read -p "Apakah Anda ingin menjalankan login OTP GoPay sekarang? (y/n): " RUN_LOGIN

if [[ "$RUN_LOGIN" =~ ^[Yy]$ ]]; then
    echo -e "\n[INFO] Menjalankan login.js..."
    node login.js
else
    echo -e "${YELLOW}[INFO] Anda dapat menjalankan login OTP kapan saja dengan perintah: node login.js${NC}"
fi

echo -e "\n${GREEN}=========================================================="
echo "                 SETUP SELESAI SUKSES!                    "
echo "=========================================================="
echo -e "${NC}"
echo "Petunjuk cPanel:"
echo "1. Di menu 'Setup Node.js App', set Application Startup File ke: server.js"
echo "2. Pastikan Node.js Version diset ke 18.x"
echo "3. Klik 'Restart' di menu Setup Node.js App cPanel."
echo "=========================================================="
