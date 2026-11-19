const base = require('node:path').join(__dirname, '..');
const envFile = require('node:path').join(base, '.env');
if (require('node:fs').existsSync(envFile)) require('dotenv').config({ path: envFile });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const axios = require('axios');
const mysql = require('mysql2/promise');
const { z } = require('zod');
const { createLocalJWKSet, jwtVerify } = require('jose');
const { encrypt, decrypt, randomApiKey } = require('./crypto');
const { generateDynamicQRIS, validateQris } = require('./qris');
const { requestOtp, verifyOtp, listTransactions } = require('./gopayAdapter');
const { MAX_PAYABLE_AMOUNT, allocateUniqueAmount, normalizeTransaction, transactionMatchesPayment, toMysqlDateTime } = require('./paymentLogic');
const { getPaymentForUser } = require('./paymentStatus');

const app = express();
const port = Number(process.env.PLATFORM_PORT || 3100);
const webOrigin = process.env.WEB_ORIGIN || 'http://localhost:5173';
const isProduction = process.env.NODE_ENV === 'production';
const pool = mysql.createPool({ host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT || 3306), user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, database: process.env.MYSQL_DATABASE, connectionLimit: 10 });
const DEFAULT_PAYMENT_EXPIRY_MS = Number(process.env.PAYMENT_EXPIRY_MS || 15 * 60 * 1000);
const DEFAULT_PAYMENT_INTERVAL_MS = Number(process.env.PAYMENT_POLL_INTERVAL_MS || 8000);
const PAYMENT_MIN_SURCHARGE = Number(process.env.PAYMENT_MIN_SURCHARGE || 35);
const PAYMENT_MAX_SURCHARGE = Number(process.env.PAYMENT_MAX_SURCHARGE || 99);
const rateLimitMap = new Map();
const MAX_REQUESTS_PER_5MIN = 60;
const WINDOW_MS = 5 * 60 * 1000;

function checkRateLimit(userId) {
  const now = Date.now();
  const userKey = String(userId);
  let last = rateLimitMap.get(userKey) || { count: 0, reset: 0 };
  if (now - last.reset > WINDOW_MS) {
    last = { count: 0, reset: now };
  }
  if (last.count >= MAX_REQUESTS_PER_5MIN) {
    const wait = Math.ceil((last.reset + WINDOW_MS - now) / 1000);
    const error = new Error(`Rate limit exceeded. Tunggu ${wait} detik`);
    error.statusCode = 429;
    throw error;
  }
  last.count++;
  last.reset = last.reset || now;
  rateLimitMap.set(userKey, last);
}

function cleanupRateLimit() {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now - value.reset > WINDOW_MS) rateLimitMap.delete(key);
  }
}
const cleanupInterval = setInterval(cleanupRateLimit, 60000);
cleanupInterval.unref();

async function pollMerchantPayments(userId) {
  checkRateLimit(userId);
  const connection = await pool.getConnection();
  try {
    const [accounts] = await connection.execute("SELECT merchant_id, encrypted_session FROM gopay_accounts WHERE user_id=? AND status='connected'", [userId]);
    if (!accounts[0]?.merchant_id || !accounts[0]?.encrypted_session) return 0;
    const session = JSON.parse(decrypt(accounts[0].encrypted_session));
    const end = new Date();
    const start = new Date(end.getTime() - 36 * 60 * 60 * 1000);
    const { transactions, session: activeSession } = await listTransactions(session, {
      merchantId: accounts[0].merchant_id,
      startTime: start.toISOString(),
      endTime: end.toISOString()
    });
    if (activeSession.access_token !== session.access_token || activeSession.refresh_token !== session.refresh_token || activeSession.expires_at !== session.expires_at) {
      await connection.execute('UPDATE gopay_accounts SET encrypted_session=? WHERE user_id=?', [encrypt(JSON.stringify(activeSession)), userId]);
    }
    let settled = 0;
    for (const transaction of transactions.map(normalizeTransaction).filter(Boolean)) {
      const [payments] = await connection.execute("SELECT id, order_id, base_amount, surcharge, payable_amount, status, created_at, expires_at FROM payments WHERE user_id=? AND status='pending' AND payable_amount=? AND created_at <= ? AND expires_at >= ? ORDER BY created_at ASC LIMIT 2 FOR UPDATE", [userId, transaction.amount, transaction.transactionTime, transaction.transactionTime]);
      if (payments.length !== 1 || !transactionMatchesPayment(transaction, payments[0])) continue;
      const settledAt = toMysqlDateTime(transaction.transactionTime);
      const [updated] = await connection.execute("UPDATE payments SET status='paid', provider_transaction_id=?, provider_order_id=?, provider_payment_type=?, provider_issuer=?, provider_transaction_time=?, paid_at=? WHERE id=? AND user_id=? AND status='pending'", [transaction.transactionId, transaction.orderId, transaction.paymentType, transaction.issuer, settledAt, settledAt, payments[0].id, userId]);
      if (updated.affectedRows === 1) {
        settled += 1;
        await audit(userId, 'payment_paid', { trxId: payments[0].id, orderId: payments[0].order_id, amount: Number(payments[0].payable_amount), providerTransactionId: transaction.transactionId });
      }
    }
    return settled;
  } catch (error) {
    console.error(`Polling user ${userId} failed:`, error.message);
    return 0;
  } finally {
    connection.release();
  }
}
const oauthStates = new Map();
let telegramJwksPromise;
async function telegramKeyResolver(header, token) {
  if (!telegramJwksPromise) {
    telegramJwksPromise = axios.get('https://oauth.telegram.org/.well-known/jwks.json', { responseType: 'json', decompress: true, headers: { 'Accept-Encoding': 'identity' } }).then((response) => createLocalJWKSet(response.data));
  }
  return (await telegramJwksPromise)(header, token);
}

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: webOrigin, credentials: true }));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false }));

function sessionCookie(res, value, maxAge) {
  res.cookie('user_session', value, { httpOnly: true, secure: isProduction, sameSite: 'lax', maxAge, path: '/' });
}
function fail(res, status, message) { return res.status(status).json({ success: false, error: message }); }
function sessionId() { return crypto.randomBytes(32).toString('hex'); }

const apiKeyAuth = async (req, res, next) => {
  try {
    const bearer = req.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
    const supplied = req.get('x-api-key') || bearer;
    if (!supplied) {
      const user = await userFromRequest(req);
      if (user) { req.apiUserId = user.id; return next(); }
      return fail(res, 401, 'API key tidak valid');
    }
    if (!/^gpg_[A-Za-z0-9_-]{43}$/.test(supplied)) return fail(res, 401, 'API key tidak valid');
    const keyHash = crypto.createHash('sha256').update(supplied).digest('hex');
    const [rows] = await pool.execute('SELECT user_id, encrypted_key FROM api_keys WHERE key_hash=? LIMIT 1', [keyHash]);
    if (!rows[0]) return fail(res, 401, 'API key tidak valid');
    const stored = decrypt(rows[0].encrypted_key);
    const suppliedBuffer = Buffer.from(supplied);
    const storedBuffer = Buffer.from(stored);
    if (suppliedBuffer.length !== storedBuffer.length || !crypto.timingSafeEqual(suppliedBuffer, storedBuffer)) return fail(res, 401, 'API key tidak valid');
    req.apiUserId = rows[0].user_id;
    return next();
  } catch (error) {
    console.error('API key auth:', error.message);
    return fail(res, 500, 'Gagal memeriksa API key');
  }
};

function safePaymentStatus(row) {
  return {
    trxId: row.id,
    orderId: row.order_id,
    status: row.status,
    baseAmount: Number(row.base_amount),
    surcharge: Number(row.surcharge),
    payableAmount: Number(row.payable_amount),
    qris: row.status === 'pending' ? row.qris_payload : undefined,
    expiresAt: row.expires_at,
    paidAt: row.paid_at,
    providerTransaction: row.status === 'paid' ? {
      id: row.provider_transaction_id,
      orderId: row.provider_order_id,
      paymentType: row.provider_payment_type,
      issuer: row.provider_issuer,
      transactionTime: row.provider_transaction_time
    } : undefined
  };
}

async function pollMerchantPayments(userId) {
  const connection = await pool.getConnection();
  try {
    const [accounts] = await connection.execute("SELECT merchant_id, encrypted_session FROM gopay_accounts WHERE user_id=? AND status='connected'", [userId]);
    if (!accounts[0]?.merchant_id || !accounts[0]?.encrypted_session) return 0;
    const session = JSON.parse(decrypt(accounts[0].encrypted_session));
    const end = new Date();
    const start = new Date(end.getTime() - 36 * 60 * 60 * 1000);
    const { transactions, session: activeSession } = await listTransactions(session, {
      merchantId: accounts[0].merchant_id,
      startTime: start.toISOString(),
      endTime: end.toISOString()
    });
    if (activeSession.access_token !== session.access_token || activeSession.refresh_token !== session.refresh_token || activeSession.expires_at !== session.expires_at) {
      await connection.execute('UPDATE gopay_accounts SET encrypted_session=? WHERE user_id=?', [encrypt(JSON.stringify(activeSession)), userId]);
    }
    const normalized = transactions.map(normalizeTransaction).filter(Boolean);
    let settled = 0;
    for (const transaction of normalized) {
      const [payments] = await connection.execute("SELECT id, order_id, base_amount, surcharge, payable_amount, status, created_at, expires_at FROM payments WHERE user_id=? AND status='pending' AND payable_amount=? AND created_at <= ? AND expires_at >= ? ORDER BY created_at ASC LIMIT 2 FOR UPDATE", [userId, transaction.amount, transaction.transactionTime, transaction.transactionTime]);
      if (payments.length !== 1 || !transactionMatchesPayment(transaction, payments[0])) continue;
      const settledAt = toMysqlDateTime(transaction.transactionTime);
      const [updated] = await connection.execute("UPDATE payments SET status='paid', provider_transaction_id=?, provider_order_id=?, provider_payment_type=?, provider_issuer=?, provider_transaction_time=?, paid_at=? WHERE id=? AND user_id=? AND status='pending'", [transaction.transactionId, transaction.orderId, transaction.paymentType, transaction.issuer, settledAt, settledAt, payments[0].id, userId]);
      if (updated.affectedRows === 1) {
        settled += 1;
        await audit(userId, 'payment_paid', { trxId: payments[0].id, orderId: payments[0].order_id, amount: Number(payments[0].payable_amount), providerTransactionId: transaction.transactionId });
      }
    }
    return settled;
  } finally {
    connection.release();
  }
}

async function userFromRequest(req) {
  const sid = req.cookies.user_session;
  if (!sid) return null;
  const [rows] = await pool.execute('SELECT u.id, u.telegram_id, u.username, u.first_name FROM web_sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.expires_at > NOW()', [sid]);
  return rows[0] || null;
}
async function requireUser(req, res, next) {
  try { req.user = await userFromRequest(req); if (!req.user) return fail(res, 401, 'Login Telegram diperlukan'); next(); }
  catch (error) { console.error('auth middleware:', error.message); return fail(res, 500, 'Gagal memeriksa session'); }
}
async function audit(userId, action, metadata = null) {
  await pool.execute('INSERT INTO activity_logs (user_id, action, metadata) VALUES (?, ?, ?)', [userId, action, metadata ? JSON.stringify(metadata) : null]);
}

app.get('/api/health', (_req, res) => res.json({ success: true, service: 'gopay-gateway-platform' }));

app.get('/api/auth/telegram/start', (req, res) => {
  if (!process.env.TELEGRAM_CLIENT_ID || !process.env.TELEGRAM_CLIENT_SECRET) return fail(res, 503, 'Telegram OAuth belum dikonfigurasi');
  const state = crypto.randomBytes(24).toString('hex');
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  oauthStates.set(state, { verifier, expiresAt: Date.now() + 10 * 60 * 1000 });
  setTimeout(() => oauthStates.delete(state), 10 * 60 * 1000).unref();
  const params = new URLSearchParams({ client_id: process.env.TELEGRAM_CLIENT_ID, redirect_uri: process.env.TELEGRAM_REDIRECT_URI, response_type: 'code', scope: 'openid profile', state, code_challenge: challenge, code_challenge_method: 'S256' });
  res.json({ success: true, url: `https://oauth.telegram.org/auth?${params}` });
});

app.get('/api/auth/telegram/callback', async (req, res) => {
  const state = oauthStates.get(req.query.state);
  if (!state || state.expiresAt < Date.now()) return res.status(400).send('Telegram login expired. Silakan ulangi.');
  oauthStates.delete(req.query.state);
  try {
    const token = await axios.post('https://oauth.telegram.org/token', new URLSearchParams({ grant_type: 'authorization_code', code: req.query.code, client_id: process.env.TELEGRAM_CLIENT_ID, client_secret: process.env.TELEGRAM_CLIENT_SECRET, redirect_uri: process.env.TELEGRAM_REDIRECT_URI, code_verifier: state.verifier }).toString(), { headers: { 'content-type': 'application/x-www-form-urlencoded' } });
    const claims = await jwtVerify(token.data.id_token, telegramKeyResolver, { issuer: 'https://oauth.telegram.org', audience: process.env.TELEGRAM_CLIENT_ID });
    const payload = claims.payload;
    const telegramId = payload.id || payload.sub;
    if (!telegramId || payload.iss !== 'https://oauth.telegram.org') throw new Error('Invalid Telegram identity');
    const [result] = await pool.execute('INSERT INTO users (telegram_id, username, first_name) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE username=VALUES(username), first_name=VALUES(first_name), id=LAST_INSERT_ID(id)', [String(telegramId), payload.preferred_username || null, payload.given_name || payload.name || null]);
    const userId = result.insertId;
    const sid = sessionId();
    await pool.execute('INSERT INTO web_sessions (id, user_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))', [sid, userId]);
    await audit(userId, 'telegram_login');
    sessionCookie(res, sid, 24 * 60 * 60 * 1000);
    res.redirect(`${webOrigin}/dashboard`);
  } catch (error) { console.error('telegram callback:', error.response?.data || error.message); res.status(502).send('Login Telegram gagal. Silakan coba lagi.'); }
});

app.get('/api/auth/status', async (req, res) => { try { const user = await userFromRequest(req); res.json({ success: true, authenticated: Boolean(user), user: user ? { id: user.id, telegramId: user.telegram_id, username: user.username, firstName: user.first_name } : null }); } catch { fail(res, 500, 'Gagal membaca status login'); } });
app.post('/api/auth/logout', async (req, res) => { if (req.cookies.user_session) await pool.execute('DELETE FROM web_sessions WHERE id=?', [req.cookies.user_session]); res.clearCookie('user_session'); res.json({ success: true }); });

app.get('/api/dashboard', requireUser, async (req, res) => {
  const [gopay] = await pool.execute("SELECT phone_number, merchant_id, status, last_error, updated_at FROM gopay_accounts WHERE user_id=?", [req.user.id]);
  const [qris] = await pool.execute('SELECT static_qris, is_valid, updated_at FROM qris_configs WHERE user_id=?', [req.user.id]);
  const [key] = await pool.execute('SELECT key_prefix, created_at, rotated_at FROM api_keys WHERE user_id=?', [req.user.id]);
  res.json({ success: true, user: req.user, gopay: gopay[0] || { status: 'disconnected' }, qris: qris[0] ? { configured: true, isValid: Boolean(qris[0].is_valid), updatedAt: qris[0].updated_at, staticQris: qris[0].static_qris } : { configured: false }, apiKey: key[0] || null });
});

app.get('/api/api-key', requireUser, async (req, res) => { const [rows] = await pool.execute('SELECT encrypted_key, key_prefix, created_at, rotated_at FROM api_keys WHERE user_id=?', [req.user.id]); if (!rows[0]) return fail(res, 404, 'API key belum dibuat'); res.json({ success: true, apiKey: { key: decrypt(rows[0].encrypted_key), prefix: rows[0].key_prefix, createdAt: rows[0].created_at, rotatedAt: rows[0].rotated_at } }); });
app.post('/api/api-key', requireUser, async (req, res) => { const key = randomApiKey(); await pool.execute('INSERT INTO api_keys (user_id, encrypted_key, key_prefix, key_hash) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE encrypted_key=VALUES(encrypted_key), key_prefix=VALUES(key_prefix), key_hash=VALUES(key_hash), rotated_at=NOW()', [req.user.id, encrypt(key), key.slice(0, 12), crypto.createHash('sha256').update(key).digest('hex')]); await audit(req.user.id, 'api_key_created_or_rotated'); res.json({ success: true, apiKey: { key, prefix: key.slice(0, 12) } }); });

const pollingUsers = new Set();
const pollingTimer = setInterval(() => {
  pool.execute("SELECT user_id FROM gopay_accounts WHERE status='connected'")
    .then(([rows]) => rows.forEach(({ user_id: userId }) => {
      if (pollingUsers.has(String(userId))) return;
      pollingUsers.add(String(userId));
      pollMerchantPayments(userId)
        .catch((error) => console.error('GoPay payment polling failed:', error.message))
        .finally(() => pollingUsers.delete(String(userId)));
    }))
    .catch((error) => console.error('GoPay poll scheduler failed:', error.message));
}, DEFAULT_PAYMENT_INTERVAL_MS);
pollingTimer.unref();

const requirePositiveId = z.string().trim().min(1).max(128);
const createPaymentSchema = z.object({
  orderId: requirePositiveId,
  amount: z.coerce.number().int().positive().max(MAX_PAYABLE_AMOUNT - PAYMENT_MIN_SURCHARGE),
  idempotencyKey: z.string().trim().min(1).max(128).optional(),
  expiresIn: z.coerce.number().int().min(60).max(3600).optional()
});

async function createPaymentForUser(userId, input) {
  const idempotencyKey = input.idempotencyKey || input.orderId;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[existing]] = await connection.execute('SELECT * FROM payments WHERE user_id=? AND (idempotency_key=? OR order_id=?) LIMIT 1 FOR UPDATE', [userId, idempotencyKey, input.orderId]);
    if (existing) {
      if (Number(existing.base_amount) !== input.amount) {
        const conflict = new Error('Order/idempotency key sudah pernah dibuat dengan nominal berbeda');
        conflict.statusCode = 409;
        throw conflict;
      }
      await connection.commit();
      return { row: existing, created: false };
    }
    const [[account]] = await connection.execute("SELECT merchant_id, status FROM gopay_accounts WHERE user_id=? FOR UPDATE", [userId]);
    if (!account || account.status !== 'connected' || !account.merchant_id) {
      const error = new Error('Akun GoPay Merchant belum terhubung');
      error.statusCode = 409;
      throw error;
    }
    const now = new Date();
    const [busyRows] = await connection.execute("SELECT payable_amount FROM payments WHERE status='pending' AND reservation_until>? FOR UPDATE", [now]);
    const allocation = allocateUniqueAmount(input.amount, new Set(busyRows.map((row) => Number(row.payable_amount))), PAYMENT_MIN_SURCHARGE, PAYMENT_MAX_SURCHARGE);
    const ttlMs = Number(input.expiresIn || Math.floor(DEFAULT_PAYMENT_EXPIRY_MS / 1000)) * 1000;
    const expiresAt = new Date(now.getTime() + ttlMs);
    const reservationUntil = new Date(expiresAt.getTime() + 36 * 60 * 60 * 1000);
    const trxId = crypto.randomUUID();
    const [configs] = await connection.execute('SELECT static_qris FROM qris_configs WHERE user_id=? AND is_valid=1', [userId]);
    if (!configs[0]) {
      const error = new Error('Simpan QRIS GoPay Merchant terlebih dahulu');
      error.statusCode = 409;
      throw error;
    }
    const qrisPayload = generateDynamicQRIS(configs[0].static_qris, allocation.payableAmount);
    await connection.execute("INSERT INTO payments (id,user_id,order_id,idempotency_key,base_amount,surcharge,payable_amount,qris_payload,status,expires_at,reservation_until) VALUES (?,?,?,?,?,?,?,?, 'pending',?,?)", [trxId,userId,input.orderId,idempotencyKey,input.amount,allocation.surcharge,allocation.payableAmount,qrisPayload,expiresAt,reservationUntil]);
    const [[created]] = await connection.execute('SELECT * FROM payments WHERE id=? AND user_id=?', [trxId,userId]);
    await connection.commit();
    return { row: created, created: true };
  } catch (error) {
    await connection.rollback();
    if (error.code === 'NO_UNIQUE_AMOUNT_AVAILABLE') error.statusCode = 409;
    throw error;
  } finally {
    connection.release();
  }
}


app.post('/api/v1/payments', apiKeyAuth, async (req, res) => {
  const parsed = createPaymentSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, 'orderId, amount, idempotencyKey, atau expiresIn tidak valid');
  try {
    const result = await createPaymentForUser(req.apiUserId, parsed.data);
    return res.status(result.created ? 201 : 200).json({ success: true, payment: safePaymentStatus(result.row) });
  } catch (error) {
    return fail(res, error.statusCode || 500, error.statusCode ? error.message : 'Gagal membuat QRIS payment');
  }
});

app.get('/api/v1/payments/:trxId', apiKeyAuth, async (req, res) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.trxId)) return fail(res, 400, 'trxId tidak valid');
  try {
    const payment = await getPaymentForUser(pool, req.apiUserId, req.params.trxId);
    if (!payment) return fail(res, 404, 'Payment tidak ditemukan');
    return res.json({ success: true, payment: safePaymentStatus(payment) });
  } catch (error) {
    return fail(res, 502, 'Gagal mengecek status transaksi GoPay');
  }
});

async function expirePayments() {
  await pool.execute("UPDATE payments SET status='expired' WHERE status='pending' AND expires_at<=NOW(3)");
}
const paymentExpiryTimer = setInterval(() => expirePayments().catch((error) => console.error('Payment expiry sweep failed:', error.message)), 30000);
paymentExpiryTimer.unref();


app.get('/api/payments/:trxId', requireUser, async (req, res) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.trxId)) return fail(res, 400, 'trxId tidak valid');
  try {
    const payment = await getPaymentForUser(pool, req.user.id, req.params.trxId);
    if (!payment) return fail(res, 404, 'Payment tidak ditemukan');
  res.json({ success: true, payment: safePaymentStatus(payment) });
  } catch (error) {
    return fail(res, 502, 'Gagal mengecek status transaksi GoPay');
  }
});

const qrisSchema = z.object({ staticQris: z.string().trim().min(20).max(1000) });
app.put('/api/qris', requireUser, async (req, res) => { const parsed = qrisSchema.safeParse(req.body); if (!parsed.success) return fail(res, 400, 'QRIS tidak valid atau terlalu pendek'); let staticQris; try { staticQris = validateQris(parsed.data.staticQris); } catch (error) { return fail(res, 400, error.message); } await pool.execute('INSERT INTO qris_configs (user_id, static_qris, is_valid) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE static_qris=VALUES(static_qris), is_valid=1', [req.user.id, staticQris]); await audit(req.user.id, 'qris_updated'); res.json({ success: true }); });
app.post('/api/qris/preview', requireUser, async (req, res) => { const parsed = z.object({ amount: z.coerce.number().int().positive().max(999999999) }).safeParse(req.body); if (!parsed.success) return fail(res, 400, 'Nominal tidak valid'); const [rows] = await pool.execute('SELECT static_qris FROM qris_configs WHERE user_id=?', [req.user.id]); if (!rows[0]) return fail(res, 404, 'QRIS belum disimpan'); try { res.json({ success: true, qris: generateDynamicQRIS(rows[0].static_qris, parsed.data.amount) }); } catch (error) { return fail(res, 400, error.message); } });
app.delete('/api/qris', requireUser, async (req, res) => { await pool.execute('DELETE FROM qris_configs WHERE user_id=?', [req.user.id]); await audit(req.user.id, 'qris_deleted'); res.json({ success: true }); });

app.post('/api/gopay/connect/start', requireUser, async (req, res) => {
  const parsed = z.object({ phoneNumber: z.string().trim().min(8).max(20) }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, 'Nomor GoPay tidak valid');
  try {
    const result = await requestOtp(req.user.id, parsed.data.phoneNumber);
    await pool.execute('INSERT INTO gopay_accounts (user_id, phone_number, status) VALUES (?, ?, \'otp_pending\') ON DUPLICATE KEY UPDATE phone_number=VALUES(phone_number), status=\'otp_pending\', last_error=NULL', [req.user.id, parsed.data.phoneNumber]);
    await audit(req.user.id, 'gopay_otp_requested');
    return res.json({ success: true, status: 'otp_pending', expiresIn: result.expiresIn });
  } catch (error) {
    return fail(res, 502, 'GoBiz menolak request OTP. Perbarui aplikasi GoPay Merchant atau coba lagi nanti.');
  }
});

app.post('/api/gopay/connect/verify', requireUser, async (req, res) => {
  const parsed = z.object({ otp: z.string() }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, 'Kirim kode OTP sebagai teks');
  try {
    const result = await verifyOtp(req.user.id, parsed.data.otp);
    await pool.execute('UPDATE gopay_accounts SET phone_number=?, merchant_id=?, encrypted_session=?, status=\'connected\', last_error=NULL WHERE user_id=?', [result.phoneNumber, result.merchantId, encrypt(JSON.stringify(result.session)), req.user.id]);
    await audit(req.user.id, 'gopay_connected', { merchantId: result.merchantId });
    return res.json({ success: true, status: 'connected', merchantId: result.merchantId, phoneNumber: result.phoneNumber });
  } catch (error) {
    await pool.execute('UPDATE gopay_accounts SET status=\'error\', last_error=? WHERE user_id=?', [error.message.slice(0, 500), req.user.id]);
    return fail(res, 502, error.message);
  }
});

app.get('/api/activity', requireUser, async (req, res) => { const [rows] = await pool.execute('SELECT action, metadata, created_at FROM activity_logs WHERE user_id=? ORDER BY id DESC LIMIT 50', [req.user.id]); res.json({ success: true, items: rows }); });

app.use((error, _req, res, _next) => { console.error('unhandled:', error); fail(res, 500, 'Terjadi kesalahan internal'); });
app.listen(port, () => console.log(`Platform API listening on ${port}`));
