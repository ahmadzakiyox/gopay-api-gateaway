const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const PORT_SERVER_DEFAULT = process.env.PORT || 3000;
const BATAS_MAKSIMAL_LOG_MEMORI = 100;
const DURASI_HAPUS_TRANSAKSI_LAMA_MS = 24 * 60 * 60 * 1000;
const DURASI_KEDALUWARSA_QRIS_MS = 5 * 60 * 1000;
const URL_API_GOJEK_TRANSAKSI = 'https://api.gojekapi.com/merchant-analytics/v2/merchants/transactions';
const MERCHANT_ID_DEFAULT = 'G020877062';

const daftarTransaksiYangSudahDiklaimMap = new Map();
const daftarLogAktivitasMemoriArray = [];
const penyimpananPenyimpanGambarQRISMap = new Map();

const CACHE_FILE = path.join(__dirname, '.gopay_cache.json');

function saveCookieToFile(cookie) {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify({ gopay_cookie: cookie }), 'utf-8');
        catatLogAktivitas('INFO', 'Cookie berhasil disimpan secara permanen ke ' + CACHE_FILE);
    } catch (err) {
        catatLogAktivitas('ERROR', 'Gagal menyimpan cookie ke file: ' + err.message);
    }
}

function loadCookieFromFile() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
            return data.gopay_cookie || null;
        }
    } catch (err) {
        catatLogAktivitas('ERROR', 'Gagal membaca cookie dari file: ' + err.message);
    }
    return null;
}

function catatLogAktivitas(tipeLog, pesanLog, detailLog = null) {
    const waktuISO = new Date().toISOString();
    const objekLog = { id: Date.now(), timestamp: waktuISO, type: tipeLog, message: pesanLog, details: detailLog };
    daftarLogAktivitasMemoriArray.unshift(objekLog);
    if (daftarLogAktivitasMemoriArray.length > BATAS_MAKSIMAL_LOG_MEMORI) {
        daftarLogAktivitasMemoriArray.pop();
    }
    console.log(`[${waktuISO}] [${tipeLog}] ${pesanLog}`);
}

function bersihkanTransaksiKadaluwarsa() {
    const waktuSekarangMs = Date.now();
    for (const [idTransaksi, waktuSimpanMs] of daftarTransaksiYangSudahDiklaimMap.entries()) {
        if (waktuSekarangMs - waktuSimpanMs > DURASI_HAPUS_TRANSAKSI_LAMA_MS) {
            daftarTransaksiYangSudahDiklaimMap.delete(idTransaksi);
        }
    }
}
setInterval(bersihkanTransaksiKadaluwarsa, 60 * 60 * 1000);

function hitungChecksumCRC16(teksPayloadTanpaCRC) {
    let nilaiCRC = 0xFFFF;
    for (let indeksKarakter = 0; indeksKarakter < teksPayloadTanpaCRC.length; indeksKarakter++) {
        nilaiCRC ^= teksPayloadTanpaCRC.charCodeAt(indeksKarakter) << 8;
        for (let indeksBit = 0; indeksBit < 8; indeksBit++) {
            if ((nilaiCRC & 0x8000) !== 0) {
                nilaiCRC = ((nilaiCRC << 1) ^ 0x1021) & 0xFFFF;
            } else {
                nilaiCRC = (nilaiCRC << 1) & 0xFFFF;
            }
        }
    }
    return nilaiCRC.toString(16).toUpperCase().padStart(4, '0');
}

function buatQRISDinamis(qrisStatisTemplate, nominalRupiah) {
    if (!qrisStatisTemplate) return null;
    let payloadDasar = qrisStatisTemplate.slice(0, -4);
    if (payloadDasar.endsWith('6304')) payloadDasar = payloadDasar.slice(0, -4);

    const teksNominal = parseInt(nominalRupiah, 10).toString();
    const panjangTag54 = teksNominal.length.toString().padStart(2, '0');
    const tag54Format = `54${panjangTag54}${teksNominal}`;

    let payloadHasil = payloadDasar;
    if (payloadHasil.includes('54')) {
        payloadHasil = payloadHasil.replace(/54\d{2}\d+/, tag54Format);
    } else {
        const posisiTag58 = payloadHasil.indexOf('5802');
        if (posisiTag58 !== -1) {
            payloadHasil = payloadHasil.slice(0, posisiTag58) + tag54Format + payloadHasil.slice(posisiTag58);
        } else {
            payloadHasil += tag54Format;
        }
    }

    if (!payloadHasil.endsWith('6304')) {
        payloadHasil += '6304';
    }

    const nilaiCRC16 = hitungChecksumCRC16(payloadHasil);
    return payloadHasil + nilaiCRC16;
}

function ekstrakAccessTokenDariCookie(teksCookie) {
    if (!teksCookie) return null;
    const pencocokanToken = teksCookie.match(/access_token=([^;]+)/);
    return pencocokanToken ? pencocokanToken[1] : null;
}

function buatHeaderPermintaanGojek(accessToken, teksCookie, userAgentKlien) {
    return {
        'Authorization': accessToken ? `Bearer ${accessToken}` : teksCookie,
        'authentication-type': 'go-id',
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://portal.gofoodmerchant.co.id',
        'Referer': 'https://portal.gofoodmerchant.co.id/',
        'User-Agent': userAgentKlien || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36'
    };
}

const autentikasiApiKey = (permintaan, respon, lanjut) => {
    const apiKeyDiterima = permintaan.headers['x-api-key'] || permintaan.query.api_key || permintaan.query.apikey;
    if (!apiKeyDiterima || apiKeyDiterima !== process.env.API_KEY) {
        return respon.status(401).json({ success: false, message: 'Autentikasi Gagal: API Key Tidak Valid' });
    }
    lanjut();
};

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (permintaan, respon) => {
    respon.send('GoPay Partner API Gateway Berjalan');
});

app.get('/health', (permintaan, respon) => {
    respon.json({ status: 'OK', service: 'GoPay Partner API Gateway', timestamp: new Date() });
});

app.get('/api/health', (permintaan, respon) => {
    respon.json({ success: true, message: 'Layanan API GoPay Berfungsi Normal', timestamp: new Date() });
});

app.post('/auth/login-email', autentikasiApiKey, async (permintaan, respon) => {
    const { email, password } = permintaan.body;
    if (!email || !password) {
        return respon.status(400).json({ success: false, message: 'Wajib Menyediakan Email dan Password' });
    }

    try {
        await axios.post('https://api.gobiz.co.id/goid/login/request', {
            email: email,
            login_type: 'password',
            client_id: 'go-biz-web-new'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authentication-Type': 'go-id',
                'X-User-Type': 'merchant',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
                'Origin': 'https://portal.gofoodmerchant.co.id',
                'Referer': 'https://portal.gofoodmerchant.co.id/'
            },
            timeout: 10000
        }).catch(gagalPermintaanAwal => null);

        const responTokenGojek = await axios.post('https://api.gobiz.co.id/goid/token', {
            client_id: 'go-biz-web-new',
            grant_type: 'password',
            data: { email: email, password: password }
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authentication-Type': 'go-id',
                'X-User-Type': 'merchant',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
                'Origin': 'https://portal.gofoodmerchant.co.id',
                'Referer': 'https://portal.gofoodmerchant.co.id/'
            },
            timeout: 10000
        });

        const dataTokenAkses = responTokenGojek.data;
        const accessTokenDiterima = dataTokenAkses.access_token || dataTokenAkses.data?.access_token;
        const refreshTokenDiterima = dataTokenAkses.refresh_token || dataTokenAkses.data?.refresh_token;

        if (accessTokenDiterima) {
            const cookieSesiFormatOtomatis = `access_token=${accessTokenDiterima}; refresh_token=${refreshTokenDiterima || ''}; auth_method=goid`;
            process.env.GOPAY_COOKIE = cookieSesiFormatOtomatis;
            saveCookieToFile(cookieSesiFormatOtomatis);
            catatLogAktivitas('SUCCESS', `Login Email Berhasil! Token Baru Otomatis Disimpan di Memory dan File.`);

            respon.json({
                success: true,
                message: 'Login Email Berhasil! Token Baru Otomatis Aktif',
                data: {
                    access_token: accessTokenDiterima,
                    refresh_token: refreshTokenDiterima,
                    cookie: cookieSesiFormatOtomatis
                }
            });
        } else {
            respon.status(400).json({ success: false, message: 'Login Gagal: Token Tidak Ditemukan dalam Respon' });
        }
    } catch (gagalLoginEmail) {
        const detailPesanGagal = gagalLoginEmail.response ? JSON.stringify(gagalLoginEmail.response.data) : gagalLoginEmail.message;
        catatLogAktivitas('ERROR', `Gagal Login Email: ${detailPesanGagal}`);
        respon.status(500).json({ success: false, message: 'Gagal Melakukan Login Email ke GoJek', error: detailPesanGagal });
    }
});

app.get('/token-status', autentikasiApiKey, async (permintaan, respon) => {
    const teksCookieAktif = loadCookieFromFile() || process.env.GOPAY_COOKIE;
    if (!teksCookieAktif) {
        return respon.json({ success: false, data: { token_status: 'invalid', message: 'Cookie Belum Dikonfigurasi' } });
    }
    try {
        const accessToken = ekstrakAccessTokenDariCookie(teksCookieAktif);
        const merchantId = process.env.GOPAY_MERCHANT_ID || MERCHANT_ID_DEFAULT;
        const waktuSekarang = new Date();
        const waktuSatuJamLaluISO = new Date(waktuSekarang.getTime() - 3600 * 1000).toISOString();

        await axios.get(URL_API_GOJEK_TRANSAKSI, {
            headers: buatHeaderPermintaanGojek(accessToken, teksCookieAktif, permintaan.headers['user-agent']),
            params: {
                from: 0,
                size: 1,
                statuses: 'SETTLEMENT,CAPTURE',
                payment_types: 'QRIS,GOPAY',
                start_time: waktuSatuJamLaluISO,
                end_time: waktuSekarang.toISOString(),
                merchant_ids: merchantId
            },
            timeout: 5000
        });

        respon.json({ success: true, data: { token_status: 'valid', message: 'Token dan Cookie Aktif dan Berfungsi' } });
    } catch (gagalUjiToken) {
        respon.json({ success: false, data: { token_status: 'invalid', message: gagalUjiToken.message } });
    }
});

app.post('/create-qris', autentikasiApiKey, (permintaan, respon) => {
    const { amount } = permintaan.body;
    if (!amount || isNaN(amount) || amount <= 0) {
        return respon.status(400).json({ success: false, message: 'Nominal Pembayaran Tidak Valid' });
    }

    const qrisStatisTemplate = process.env.QRIS_STATIC;
    if (!qrisStatisTemplate) {
        return respon.status(500).json({ success: false, message: 'QRIS_STATIC Belum Dikonfigurasi di .env' });
    }

    const kodeQRISDinamis = buatQRISDinamis(qrisStatisTemplate, amount);
    const idUnikQRIS = Math.random().toString(36).substring(2, 10);
    const waktuKedaluwarsa = new Date(Date.now() + DURASI_KEDALUWARSA_QRIS_MS);

    penyimpananPenyimpanGambarQRISMap.set(idUnikQRIS, { data: kodeQRISDinamis, expiresAt: waktuKedaluwarsa });

    const hostServer = permintaan.get('host');
    const skemaProtokol = permintaan.protocol;
    const urlGambarQRISPublic = `${skemaProtokol}://${hostServer}/qr/${idUnikQRIS}`;

    catatLogAktivitas('INFO', `QRIS Dinamis Dibuat Untuk Nominal: Rp ${amount}`);

    respon.json({
        success: true,
        data: {
            qris_url: urlGambarQRISPublic,
            qris_code: kodeQRISDinamis,
            amount: parseInt(amount, 10),
            expires_at: waktuKedaluwarsa.toISOString(),
            expires_in: '5 menit'
        }
    });
});

app.get('/qr/:id', (permintaan, respon) => {
    const dataQRIS = penyimpananPenyimpanGambarQRISMap.get(permintaan.params.id);
    if (!dataQRIS) return respon.status(404).send('Gambar QRIS Tidak Ditemukan');
    if (Date.now() > dataQRIS.expiresAt.getTime()) {
        penyimpananPenyimpanGambarQRISMap.delete(permintaan.params.id);
        return respon.status(410).send('Gambar QRIS Sudah Kedaluwarsa');
    }
    const urlLayananQRCodeServer = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(dataQRIS.data)}`;
    respon.redirect(302, urlLayananQRCodeServer);
});

app.get('/transactions', autentikasiApiKey, async (permintaan, respon) => {
    const teksCookieAktif = permintaan.headers['x-gopay-cookie'] || loadCookieFromFile() || process.env.GOPAY_COOKIE;
    if (!teksCookieAktif) return respon.status(400).json({ success: false, error: 'GoPay Cookie Wajib Disediakan' });

    try {
        const accessToken = ekstrakAccessTokenDariCookie(teksCookieAktif);
        const merchantId = permintaan.headers['x-gopay-merchant-id'] || process.env.GOPAY_MERCHANT_ID || MERCHANT_ID_DEFAULT;
        const waktuSekarang = new Date();
        const waktuMulaiISO = permintaan.query.startTime ? new Date(parseInt(permintaan.query.startTime) * 1000).toISOString() : new Date(waktuSekarang.getTime() - 3 * 24 * 3600 * 1000).toISOString();
        const waktuSelesaiISO = permintaan.query.endTime ? new Date(parseInt(permintaan.query.endTime) * 1000).toISOString() : waktuSekarang.toISOString();

        const responAPI = await axios.get(URL_API_GOJEK_TRANSAKSI, {
            headers: buatHeaderPermintaanGojek(accessToken, teksCookieAktif, permintaan.headers['user-agent']),
            params: {
                from: 0,
                size: parseInt(permintaan.query.pageSize || '20', 10),
                statuses: 'SETTLEMENT,CAPTURE,REFUND,PARTIAL_REFUND',
                payment_types: 'QRIS,GOPAY,OFFLINE_CREDIT_CARD,OFFLINE_DEBIT_CARD,CREDIT_CARD',
                start_time: waktuMulaiISO,
                end_time: waktuSelesaiISO,
                merchant_ids: merchantId
            },
            timeout: 10000
        });

        const daftarTransaksiMentah = responAPI.data?.transactions || responAPI.data?.data?.transactions || [];
        const daftarTransaksiTerformat = daftarTransaksiMentah.map(transaksi => ({
            amount: parseInt(transaksi.gross_amount || transaksi.real_gross_amount || 0, 10),
            status: transaksi.transaction_status ? transaksi.transaction_status.toLowerCase() : 'success',
            time: transaksi.transaction_time || transaksi.settlement_time,
            issuer: transaksi.qris_provider_aspi_issuer || 'GoPay / Bank',
            order_id: transaksi.order_id,
            transaction_id: transaksi.id
        }));

        respon.json({
            success: true,
            total_amount: String(daftarTransaksiTerformat.reduce((total, transaksi) => total + transaksi.amount, 0)),
            data: { transactions: daftarTransaksiTerformat }
        });
    } catch (gagalAmbilTransaksi) {
        respon.status(500).json({ success: false, error: gagalAmbilTransaksi.message });
    }
});

app.get('/transactions/all', autentikasiApiKey, async (permintaan, respon) => {
    const tanggalSekarang = new Date();
    const awalBulanIniUnix = Math.floor(new Date(tanggalSekarang.getFullYear(), tanggalSekarang.getMonth(), 1).getTime() / 1000);
    permintaan.query.startTime = awalBulanIniUnix;
    permintaan.query.pageSize = 100;
    return app._router.handle({ ...permintaan, url: '/transactions', method: 'GET' }, respon);
});

app.post('/check-payment', autentikasiApiKey, async (permintaan, respon) => {
    const { amount, startTime } = permintaan.body;
    const teksCookieAktif = permintaan.headers['x-gopay-cookie'] || loadCookieFromFile() || process.env.GOPAY_COOKIE;

    if (!teksCookieAktif) {
        return respon.status(400).json({
            success: false,
            message: 'GoPay Cookie Wajib Disediakan di Header (X-GoPay-Cookie) Atau di .env (GOPAY_COOKIE)'
        });
    }

    try {
        const accessToken = ekstrakAccessTokenDariCookie(teksCookieAktif);
        const merchantId = permintaan.headers['x-gopay-merchant-id'] || process.env.GOPAY_MERCHANT_ID || MERCHANT_ID_DEFAULT;
        const waktuSekarang = new Date();
        const waktuMulaiISO = startTime ? new Date(startTime).toISOString() : new Date(waktuSekarang.getTime() - 24 * 60 * 60 * 1000).toISOString();
        const waktuSelesaiISO = waktuSekarang.toISOString();

        const responAPI = await axios.get(URL_API_GOJEK_TRANSAKSI, {
            headers: buatHeaderPermintaanGojek(accessToken, teksCookieAktif, permintaan.headers['user-agent']),
            params: {
                from: 0,
                size: 20,
                statuses: 'SETTLEMENT,CAPTURE,REFUND,PARTIAL_REFUND',
                payment_types: 'QRIS,GOPAY,OFFLINE_CREDIT_CARD,OFFLINE_DEBIT_CARD,CREDIT_CARD',
                start_time: waktuMulaiISO,
                end_time: waktuSelesaiISO,
                merchant_ids: merchantId
            },
            timeout: 10000
        });

        const daftarTransaksi = responAPI.data?.transactions || responAPI.data?.data?.transactions || responAPI.data?.data || [];
        const nominalTargetAngka = parseInt(amount, 10);
        const timestampFilterMulaiMs = startTime ? new Date(startTime).getTime() : 0;

        let transaksiCocok = null;

        for (const objekTransaksi of daftarTransaksi) {
            const nominalTransaksi = parseInt(objekTransaksi.gross_amount || objekTransaksi.real_gross_amount || objekTransaksi.amount?.value || objekTransaksi.amount || 0, 10);
            const timestampTransaksiMs = new Date(objekTransaksi.transaction_time || objekTransaksi.created_at || objekTransaksi.settlement_time || 0).getTime();
            const idTransaksi = objekTransaksi.id || objekTransaksi.order_id || objekTransaksi.wallstreet_transaction_id;

            if (nominalTransaksi === nominalTargetAngka && timestampTransaksiMs >= timestampFilterMulaiMs) {
                if (!daftarTransaksiYangSudahDiklaimMap.has(idTransaksi)) {
                    daftarTransaksiYangSudahDiklaimMap.set(idTransaksi, Date.now());
                    transaksiCocok = {
                        transaction_id: idTransaksi,
                        order_id: objekTransaksi.order_id,
                        amount: nominalTransaksi,
                        payer_issuer: objekTransaksi.qris_provider_aspi_issuer || 'GoPay / Bank',
                        payment_type: objekTransaksi.payment_type || objekTransaksi.transaction_source || 'GOPAY_INSTORE',
                        transaction_time: objekTransaksi.transaction_time || objekTransaksi.settlement_time
                    };
                    break;
                }
            }
        }

        if (transaksiCocok) {
            catatLogAktivitas('SUCCESS', `Pembayaran Terverifikasi Lunas Untuk Nominal Rp ${nominalTargetAngka}`, transaksiCocok);
            return respon.json({
                success: true,
                paid: true,
                transaction: transaksiCocok
            });
        } else {
            return respon.json({
                success: true,
                paid: false,
                message: 'Pembayaran Belum Ditemukan Atau Sudah Pernah Diklaim'
            });
        }

    } catch (gagalPeriksaPembayaran) {
        const detailPesanGagal = gagalPeriksaPembayaran.response ? `HTTP ${gagalPeriksaPembayaran.response.status}: ${JSON.stringify(gagalPeriksaPembayaran.response.data)}` : gagalPeriksaPembayaran.message;
        catatLogAktivitas('ERROR', `Gagal Memeriksa Pembayaran: ${detailPesanGagal}`);
        return respon.status(500).json({
            success: false,
            message: 'Gagal Mengambil Data Transaksi Dari API GoPay',
            error: detailPesanGagal
        });
    }
});

app.get('/api/logs', autentikasiApiKey, (permintaan, respon) => {
    respon.json({ success: true, logs: daftarLogAktivitasMemoriArray });
});

app.listen(PORT_SERVER_DEFAULT, () => {
    catatLogAktivitas('SYSTEM', `GoPay Partner Gateway Berjalan pada Port ${PORT_SERVER_DEFAULT}`);
});
