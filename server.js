const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const sessionManager = require('./sessionManager');

const PORT = process.env.PORT || 3000;
const MAX_LOGS = 100;
const CLAIMED_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 jam
const QRIS_EXPIRY_MS = 5 * 60 * 1000; // 5 menit
const GOJEK_TRANSACTIONS_URL = 'https://api.gojekapi.com/merchant-analytics/v2/merchants/transactions';


const claimedTransactions = new Map();
const activityLogs = [];
const qrisStore = new Map();

const CACHE_FILE = path.join(__dirname, '.gopay_cache.json');

function saveCookieToFile(cookie) {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify({ gopay_cookie: cookie }), 'utf-8');
        logActivity('INFO', 'Cookie berhasil disimpan ke ' + CACHE_FILE);
    } catch (err) {
        logActivity('ERROR', 'Gagal simpan cookie ke file: ' + err.message);
    }
}

function logActivity(type, message, details = null) {
    const timestamp = new Date().toISOString();
    const logObj = { id: Date.now(), timestamp, type, message, details };
    activityLogs.unshift(logObj);
    if (activityLogs.length > MAX_LOGS) {
        activityLogs.pop();
    }
    console.log(`[${timestamp}] [${type}] ${message}`);
}

// Clean up expired claimed transactions
function cleanExpiredTransactions() {
    const now = Date.now();
    for (const [txId, savedAt] of claimedTransactions.entries()) {
        if (now - savedAt > CLAIMED_CLEANUP_INTERVAL_MS) {
            claimedTransactions.delete(txId);
        }
    }
}
setInterval(cleanExpiredTransactions, 60 * 60 * 1000);

// Periodik auto-refresh session (tiap 6 jam)
async function autoRefreshSessionPeriodically() {
    try {
        const session = sessionManager.loadSession();
        if (session && session.refresh_token) {
            if (sessionManager.isExpired(session)) {
                logActivity('INFO', 'Auto Refresh: Token mendekati kedaluwarsa, memperbarui sesi...');
                await sessionManager.refreshSession();
            }
        }
    } catch (err) {
        logActivity('ERROR', `Gagal auto refresh session: ${err.message}`);
    }
}
setInterval(autoRefreshSessionPeriodically, 6 * 60 * 60 * 1000);

// Hitung Checksum CRC16 EMVCo untuk QRIS
function calculateCRC16(payload) {
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
        crc ^= payload.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) {
                crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
            } else {
                crc = (crc << 1) & 0xFFFF;
            }
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Generate QRIS Dinamis dengan nominal custom
function generateDynamicQRIS(staticTemplate, amount) {
    if (!staticTemplate) return null;
    let base = staticTemplate.slice(0, -4);
    if (base.endsWith('6304')) base = base.slice(0, -4);

    const amountStr = parseInt(amount, 10).toString();
    const tag54Length = amountStr.length.toString().padStart(2, '0');
    const tag54 = `54${tag54Length}${amountStr}`;

    let result = base;
    if (result.includes('54')) {
        result = result.replace(/54\d{2}\d+/, tag54);
    } else {
        const idx58 = result.indexOf('5802');
        if (idx58 !== -1) {
            result = result.slice(0, idx58) + tag54 + result.slice(idx58);
        } else {
            result += tag54;
        }
    }

    if (!result.endsWith('6304')) {
        result += '6304';
    }

    const checksum = calculateCRC16(result);
    return result + checksum;
}

// Middleware Proteksi API Key
const apiKeyAuth = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.api_key || req.query.apikey;
    if (!apiKey || apiKey !== process.env.API_KEY) {
        return res.status(401).json({ success: false, message: 'Autentikasi Gagal: API Key tidak valid' });
    }
    next();
};

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('GoPay Partner API Gateway Berjalan');
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'GoPay Partner API Gateway', timestamp: new Date() });
});

app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Layanan API GoPay Berfungsi Normal', timestamp: new Date() });
});


// Cek Status Sesi Token
app.get('/token-status', apiKeyAuth, async (req, res) => {
    const activeHeaders = await sessionManager.getValidHeaders(req.headers['user-agent']);
    if (!activeHeaders) {
        return res.json({ success: false, data: { token_status: 'invalid', message: 'Sesi belum dikonfigurasi. Jalankan `node login.js` di terminal.' } });
    }
    try {
        const merchantId = process.env.GOPAY_MERCHANT_ID || '';
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 3600 * 1000).toISOString();

        await axios.get(GOJEK_TRANSACTIONS_URL, {
            headers: activeHeaders,
            params: {
                from: 0,
                size: 1,
                statuses: 'SETTLEMENT,CAPTURE',
                payment_types: 'QRIS,GOPAY',
                start_time: oneHourAgo,
                end_time: now.toISOString(),
                merchant_ids: merchantId
            },
            timeout: 5000
        });

        res.json({ success: true, data: { token_status: 'valid', message: 'Token dan Sesi GoPay Merchant Aktif' } });
    } catch (err) {
        res.json({ success: false, data: { token_status: 'invalid', message: err.message } });
    }
});

// Buat QRIS Dinamis (Support GET query & POST body)
app.all('/create-qris', apiKeyAuth, (req, res) => {
    const amount = req.body?.amount || req.query?.amount;
    if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Nominal pembayaran tidak valid (gunakan ?amount=...)' });
    }

    const staticTemplate = process.env.QRIS_STATIC;
    if (!staticTemplate) {
        return res.status(500).json({ success: false, message: 'QRIS_STATIC belum dikonfigurasi di .env' });
    }

    const dynamicCode = generateDynamicQRIS(staticTemplate, amount);
    const qrisId = Math.random().toString(36).substring(2, 10);
    const expiresAt = new Date(Date.now() + QRIS_EXPIRY_MS);

    qrisStore.set(qrisId, { data: dynamicCode, expiresAt });

    const host = req.get('host');
    const protocol = req.protocol;
    const publicUrl = `${protocol}://${host}/qr/${qrisId}`;

    logActivity('INFO', `QRIS Dinamis dibuat untuk nominal: Rp ${amount}`);

    res.json({
        success: true,
        data: {
            qris_url: publicUrl,
            qris_code: dynamicCode,
            amount: parseInt(amount, 10),
            expires_at: expiresAt.toISOString(),
            expires_in: '5 menit'
        }
    });
});

// Render QR Code Image Redirect
app.get('/qr/:id', (req, res) => {
    const qris = qrisStore.get(req.params.id);
    if (!qris) return res.status(404).send('Gambar QRIS tidak ditemukan');
    if (Date.now() > qris.expiresAt.getTime()) {
        qrisStore.delete(req.params.id);
        return res.status(410).send('Gambar QRIS sudah kedaluwarsa');
    }
    const qrServerUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qris.data)}`;
    res.redirect(302, qrServerUrl);
});

// Ambil Riwayat Transaksi
app.get('/transactions', apiKeyAuth, async (req, res) => {
    let headers = await sessionManager.getValidHeaders(req.headers['user-agent']);

    if (!headers && process.env.GOPAY_EMAIL && process.env.GOPAY_PASSWORD) {
        logActivity('INFO', 'Sesi tidak ditemukan, memicu auto-login...');
        await autoLoginGojek();
        headers = await sessionManager.getValidHeaders(req.headers['user-agent']);
    }

    if (!headers) return res.status(400).json({ success: false, error: 'Sesi GoPay belum ada. Jalankan `node login.js` di terminal.' });

    try {
        const fetchTransactions = async (activeHeaders) => {
            const merchantId = req.headers['x-gopay-merchant-id'] || process.env.GOPAY_MERCHANT_ID || '';
            const now = new Date();
            const startTimeISO = req.query.startTime ? new Date(parseInt(req.query.startTime) * 1000).toISOString() : new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString();
            const endTimeISO = req.query.endTime ? new Date(parseInt(req.query.endTime) * 1000).toISOString() : now.toISOString();

            return await axios.get(GOJEK_TRANSACTIONS_URL, {
                headers: activeHeaders,
                params: {
                    from: 0,
                    size: parseInt(req.query.pageSize || '20', 10),
                    statuses: 'SETTLEMENT,CAPTURE,REFUND,PARTIAL_REFUND',
                    payment_types: 'QRIS,GOPAY,OFFLINE_CREDIT_CARD,OFFLINE_DEBIT_CARD,CREDIT_CARD',
                    start_time: startTimeISO,
                    end_time: endTimeISO,
                    merchant_ids: merchantId
                },
                timeout: 10000
            });
        };

        let response;
        try {
            response = await fetchTransactions(headers);
        } catch (firstErr) {
            if (firstErr.response && firstErr.response.status === 401) {
                logActivity('WARNING', 'Sesi expired (401). Memulai auto-refresh...');
                const refreshed = await sessionManager.refreshSession();
                if (refreshed) {
                    const newHeaders = await sessionManager.getValidHeaders(req.headers['user-agent']);
                    response = await fetchTransactions(newHeaders);
                } else {
                    throw firstErr;
                }
            } else {
                throw firstErr;
            }
        }

        const rawTransactions = response.data?.transactions || response.data?.data?.transactions || [];
        const formattedTransactions = rawTransactions.map(tx => ({
            amount: parseInt(tx.gross_amount || tx.real_gross_amount || 0, 10),
            status: tx.transaction_status ? tx.transaction_status.toLowerCase() : 'success',
            time: tx.transaction_time || tx.settlement_time,
            issuer: tx.qris_provider_aspi_issuer || 'GoPay / Bank',
            order_id: tx.order_id,
            transaction_id: tx.id
        }));

        res.json({
            success: true,
            total_amount: String(formattedTransactions.reduce((total, tx) => total + tx.amount, 0)),
            data: { transactions: formattedTransactions }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Shortcut Semua Transaksi Bulan Ini
app.get('/transactions/all', apiKeyAuth, async (req, res) => {
    const now = new Date();
    const startOfMonthUnix = Math.floor(new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000);
    req.query.startTime = startOfMonthUnix;
    req.query.pageSize = 100;
    return app._router.handle({ ...req, url: '/transactions', method: 'GET' }, res);
});

// Cek Pembayaran Masuk (Support GET query & POST body)
app.all('/check-payment', apiKeyAuth, async (req, res) => {
    const amount = req.body?.amount || req.query?.amount;
    const startTime = req.body?.startTime || req.query?.startTime || req.query?.start_time;
    let headers = await sessionManager.getValidHeaders(req.headers['user-agent']);

    if (!headers && process.env.GOPAY_EMAIL && process.env.GOPAY_PASSWORD) {
        logActivity('INFO', 'Sesi tidak ditemukan, memicu auto-login...');
        await autoLoginGojek();
        headers = await sessionManager.getValidHeaders(req.headers['user-agent']);
    }

    if (!headers) {
        return res.status(400).json({
            success: false,
            message: 'Sesi GoPay belum ada. Jalankan `node login.js` di terminal.'
        });
    }

    try {
        const fetchCheckPayment = async (activeHeaders) => {
            const merchantId = req.headers['x-gopay-merchant-id'] || process.env.GOPAY_MERCHANT_ID || '';
            const now = new Date();
            const startTimeISO = startTime ? new Date(startTime).toISOString() : new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
            const endTimeISO = now.toISOString();

            return await axios.get(GOJEK_TRANSACTIONS_URL, {
                headers: activeHeaders,
                params: {
                    from: 0,
                    size: 20,
                    statuses: 'SETTLEMENT,CAPTURE,REFUND,PARTIAL_REFUND',
                    payment_types: 'QRIS,GOPAY,OFFLINE_CREDIT_CARD,OFFLINE_DEBIT_CARD,CREDIT_CARD',
                    start_time: startTimeISO,
                    end_time: endTimeISO,
                    merchant_ids: merchantId
                },
                timeout: 10000
            });
        };

        let response;
        try {
            response = await fetchCheckPayment(headers);
        } catch (firstErr) {
            if (firstErr.response && firstErr.response.status === 401) {
                logActivity('WARNING', 'Sesi expired (401) di /check-payment. Memulai auto-refresh...');
                const refreshed = await sessionManager.refreshSession();
                if (refreshed) {
                    const newHeaders = await sessionManager.getValidHeaders(req.headers['user-agent']);
                    response = await fetchCheckPayment(newHeaders);
                } else {
                    throw firstErr;
                }
            } else {
                throw firstErr;
            }
        }

        const rawTransactions = response.data?.transactions || response.data?.data?.transactions || response.data?.data || [];
        const targetAmount = parseInt(amount, 10);
        const filterStartTimeMs = startTime ? new Date(startTime).getTime() : 0;

        let matchedTransaction = null;

        for (const tx of rawTransactions) {
            const txAmount = parseInt(tx.gross_amount || tx.real_gross_amount || tx.amount?.value || tx.amount || 0, 10);
            const txTimestamp = new Date(tx.transaction_time || tx.created_at || tx.settlement_time || 0).getTime();
            const txId = tx.id || tx.order_id || tx.wallstreet_transaction_id;

            if (txAmount === targetAmount && txTimestamp >= filterStartTimeMs) {
                if (!claimedTransactions.has(txId)) {
                    claimedTransactions.set(txId, Date.now());
                    matchedTransaction = {
                        transaction_id: txId,
                        order_id: tx.order_id,
                        amount: txAmount,
                        payer_issuer: tx.qris_provider_aspi_issuer || 'GoPay / Bank',
                        payment_type: tx.payment_type || tx.transaction_source || 'GOPAY_INSTORE',
                        transaction_time: tx.transaction_time || tx.settlement_time
                    };
                    break;
                }
            }
        }

        if (matchedTransaction) {
            logActivity('SUCCESS', `Pembayaran terverifikasi lunas untuk nominal Rp ${targetAmount}`, matchedTransaction);
            return res.json({
                success: true,
                paid: true,
                transaction: matchedTransaction
            });
        } else {
            return res.json({
                success: true,
                paid: false,
                message: 'Pembayaran belum ditemukan atau sudah pernah diklaim'
            });
        }

    } catch (err) {
        const errorDetail = err.response ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}` : err.message;
        logActivity('ERROR', `Gagal periksa pembayaran: ${errorDetail}`);
        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil data transaksi dari API GoPay',
            error: errorDetail
        });
    }
});

// Logs Endpoint
app.get('/api/logs', apiKeyAuth, (req, res) => {
    res.json({ success: true, logs: activityLogs });
});

app.listen(PORT, () => {
    logActivity('SYSTEM', `GoPay Partner Gateway berjalan pada port ${PORT}`);
});
