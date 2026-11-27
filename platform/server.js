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
const { requestOtp, verifyOtp, clearPendingOtp, hasPendingOtp, listTransactions, fetchMerchantProfile } = require('./gopayAdapter');
const {
  requestShopeeOtp,
  verifyShopeeOtp,
  completeShopeeLogin,
  refreshShopeeSession,
  listShopeeTransactions,
  getShopeeTransactionDetail
} = require('./shopeeAdapter');
const { MAX_PAYABLE_AMOUNT, allocateUniqueAmount, normalizeTransaction, transactionMatchesPayment, toMysqlDateTime } = require('./paymentLogic');
const { getPaymentForUser } = require('./paymentStatus');
const { validateWebhookUrl, buildWebhookPayload, sendWebhook } = require('./webhook');
const { applyMigrations } = require('./migrate');

const app = express();
const port = Number(process.env.PLATFORM_PORT || 3100);
const webOrigin = process.env.WEB_ORIGIN || 'http://localhost:5173';
const isProduction = process.env.NODE_ENV === 'production';
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  connectionLimit: 10,
  multipleStatements: true
});
const PAYMENT_EXPIRY_SECONDS = 300;
const PAYMENT_EXPIRY_MS = PAYMENT_EXPIRY_SECONDS * 1000;
const DEFAULT_PAYMENT_INTERVAL_MS = Number(process.env.PAYMENT_POLL_INTERVAL_MS || 8000);
const PAYMENT_MIN_SURCHARGE = Number(process.env.PAYMENT_MIN_SURCHARGE || 1);
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

async function dispatchPaymentWebhook(userId, paymentId) {
  try {
    const [[payment]] = await pool.execute('SELECT * FROM payments WHERE id=? AND user_id=? LIMIT 1', [paymentId, userId]);
    if (!payment) return;

    let targetUrl = payment.webhook_url;
    let secret = '';

    const [[config]] = await pool.execute('SELECT webhook_url, secret, is_active FROM webhook_configs WHERE user_id=? LIMIT 1', [userId]);
    if (!targetUrl && config && config.is_active && config.webhook_url) {
      targetUrl = config.webhook_url;
    }
    if (config && config.secret) {
      secret = config.secret;
    }

    if (!targetUrl) {
      await pool.execute("UPDATE payments SET webhook_status='skipped' WHERE id=?", [paymentId]);
      return;
    }

    const payload = buildWebhookPayload(payment);
    const result = await sendWebhook({ url: targetUrl, secret, payload, timeoutMs: 10000, eventName: 'payment.paid' });

    const responseSummary = result.success
      ? `HTTP ${result.statusCode} (${result.responseTimeMs}ms)`
      : (result.error || `HTTP ${result.statusCode || 0}`).slice(0, 255);

    await pool.execute(
      "UPDATE payments SET webhook_status=?, webhook_attempts=webhook_attempts + 1, webhook_last_response=?, webhook_delivered_at=? WHERE id=?",
      [result.success ? 'delivered' : 'failed', responseSummary, result.success ? new Date() : null, paymentId]
    );

    await audit(userId, result.success ? 'webhook_delivered' : 'webhook_delivery_failed', {
      trxId: paymentId,
      url: targetUrl,
      statusCode: result.statusCode,
      error: result.success ? undefined : result.error
    });
  } catch (error) {
    console.error(`dispatchPaymentWebhook error for user ${userId}, payment ${paymentId}:`, error.message);
  }
}

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
        dispatchPaymentWebhook(userId, payments[0].id).catch((err) => console.error('dispatch webhook error:', err.message));
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
const pendingShopeeChallenges = new Map();
const pendingShopeeVerifications = new Map();
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
    const [rows] = await pool.execute('SELECT id, user_id, encrypted_key FROM api_keys WHERE key_hash=? LIMIT 1', [keyHash]);
    let matched = rows[0];
    if (!matched) {
      const [legacyRows] = await pool.execute('SELECT id, user_id, encrypted_key FROM api_keys WHERE key_hash IS NULL AND key_prefix=?', [supplied.slice(0, 12)]);
      for (const candidate of legacyRows) {
        const plain = decrypt(candidate.encrypted_key);
        const h = crypto.createHash('sha256').update(plain).digest('hex');
        await pool.execute('UPDATE api_keys SET key_hash=? WHERE id=?', [h, candidate.id]);
        if (h === keyHash) matched = candidate;
      }
    }
    if (!matched) return fail(res, 401, 'API key tidak valid');
    const stored = decrypt(matched.encrypted_key);
    const suppliedBuffer = Buffer.from(supplied);
    const storedBuffer = Buffer.from(stored);
    if (suppliedBuffer.length !== storedBuffer.length || !crypto.timingSafeEqual(suppliedBuffer, storedBuffer)) return fail(res, 401, 'API key tidak valid');
    req.apiUserId = matched.user_id;
    return next();
  } catch (error) {
    console.error('API key auth:', error.message);
    return fail(res, 500, 'Gagal memeriksa API key');
  }
};

function safePaymentStatus(row) {
  const remainingSec = row.status === 'pending'
    ? Math.max(0, Math.min(PAYMENT_EXPIRY_SECONDS, Math.ceil((new Date(row.expires_at).getTime() - Date.now()) / 1000)))
    : 0;
  return {
    trxId: row.id,
    orderId: row.order_id,
    status: row.status,
    baseAmount: Number(row.base_amount),
    surcharge: Number(row.surcharge),
    payableAmount: Number(row.payable_amount),
    qris: row.status === 'pending' ? row.qris_payload : undefined,
    expiresIn: remainingSec,
    expiresAt: row.expires_at,
    paidAt: row.paid_at,
    webhookUrl: row.webhook_url || undefined,
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
    const [pendingRows] = await connection.execute("SELECT 1 FROM payments WHERE user_id=? AND status='pending' AND expires_at > NOW(3) LIMIT 1", [userId]);
    if (!pendingRows.length) return 0;
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
        dispatchPaymentWebhook(userId, payments[0].id).catch((err) => console.error('dispatch webhook error:', err.message));
      }
    }
    return settled;
  } finally {
    connection.release();
  }
}

async function pollShopeePayments(userId) {
  checkRateLimit(userId);
  const connection = await pool.getConnection();
  try {
    const [pendingRows] = await connection.execute("SELECT 1 FROM payments WHERE user_id=? AND provider='shopeepay' AND status='pending' AND expires_at > NOW(3) LIMIT 1", [userId]);
    if (!pendingRows.length) return 0;
    const [accounts] = await connection.execute("SELECT merchant_id, store_id, encrypted_session FROM shopee_accounts WHERE user_id=? AND status='connected'", [userId]);
    if (!accounts[0]?.encrypted_session) return 0;
    const session = JSON.parse(decrypt(accounts[0].encrypted_session));
    const end = new Date();
    const start = new Date(end.getTime() - 36 * 60 * 60 * 1000);
    const { transactions, session: activeSession } = await listShopeeTransactions(session, {
      startTime: start.toISOString(),
      endTime: end.toISOString()
    });
    if (activeSession && activeSession !== session) {
      await connection.execute('UPDATE shopee_accounts SET encrypted_session=? WHERE user_id=?', [encrypt(JSON.stringify(activeSession)), userId]);
    }
    let settled = 0;
    for (const transaction of transactions) {
      const [payments] = await connection.execute("SELECT id, order_id, base_amount, surcharge, payable_amount, status, created_at, expires_at FROM payments WHERE user_id=? AND provider='shopeepay' AND status='pending' AND payable_amount=? AND created_at <= ? AND expires_at >= ? ORDER BY created_at ASC LIMIT 2 FOR UPDATE", [userId, transaction.amount, transaction.transactionTime, transaction.transactionTime]);
      if (payments.length !== 1 || !transactionMatchesPayment(transaction, payments[0])) continue;
      const detail = await getShopeeTransactionDetail(activeSession || session, {
        orderSn: transaction.transactionId,
        transactionType: transaction.transactionType,
        service: transaction.service
      }).catch(() => null);
      const issuer = String(detail?.issuer || '').trim() || transaction.issuer || null;
      const settledAt = toMysqlDateTime(transaction.transactionTime);
      const [updated] = await connection.execute("UPDATE payments SET status='paid', provider_transaction_id=?, provider_order_id=?, provider_payment_type=?, provider_issuer=?, provider_transaction_time=?, paid_at=? WHERE id=? AND user_id=? AND status='pending'", [transaction.transactionId, transaction.orderId, transaction.paymentType, issuer, settledAt, settledAt, payments[0].id, userId]);
      if (updated.affectedRows === 1) {
        settled += 1;
        await audit(userId, 'shopee_payment_paid', { trxId: payments[0].id, orderId: payments[0].order_id, amount: Number(payments[0].payable_amount), providerTransactionId: transaction.transactionId });
        dispatchPaymentWebhook(userId, payments[0].id).catch((err) => console.error('dispatch webhook error:', err.message));
      }
    }
    return settled;
  } catch (err) {
    console.error(`pollShopeePayments error for user ${userId}:`, err.message);
    return 0;
  } finally {
    connection.release();
  }
}

async function userFromRequest(req) {
  const sid = req.cookies.user_session;
  if (!sid) return null;
  const [rows] = await pool.execute('SELECT u.id, u.telegram_id, u.username, u.first_name, u.photo_url FROM web_sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.expires_at > NOW()', [sid]);
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
  if (!state || state.expiresAt < Date.now()) return res.redirect(`${webOrigin}/?login=error&reason=${encodeURIComponent('Sesi login Telegram kedaluwarsa. Silakan ulangi.')}`);
  oauthStates.delete(req.query.state);
  try {
    const token = await axios.post('https://oauth.telegram.org/token', new URLSearchParams({ grant_type: 'authorization_code', code: req.query.code, client_id: process.env.TELEGRAM_CLIENT_ID, client_secret: process.env.TELEGRAM_CLIENT_SECRET, redirect_uri: process.env.TELEGRAM_REDIRECT_URI, code_verifier: state.verifier }).toString(), { headers: { 'content-type': 'application/x-www-form-urlencoded' } });
    const claims = await jwtVerify(token.data.id_token, telegramKeyResolver, { issuer: 'https://oauth.telegram.org', audience: process.env.TELEGRAM_CLIENT_ID });
    const payload = claims.payload;
    const telegramId = payload.id || payload.sub;
    if (!telegramId || payload.iss !== 'https://oauth.telegram.org') throw new Error('Invalid Telegram identity');
    const photoUrl = typeof payload.picture === 'string' && /^https:\/\//.test(payload.picture) ? payload.picture.slice(0, 512) : null;
    const [result] = await pool.execute('INSERT INTO users (telegram_id, username, first_name, photo_url) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE username=VALUES(username), first_name=VALUES(first_name), photo_url=VALUES(photo_url), id=LAST_INSERT_ID(id)', [String(telegramId), payload.preferred_username || null, payload.given_name || payload.name || null, photoUrl]);
    const userId = result.insertId;
    const sid = sessionId();
    await pool.execute('INSERT INTO web_sessions (id, user_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))', [sid, userId]);
    await audit(userId, 'telegram_login');
    sessionCookie(res, sid, 24 * 60 * 60 * 1000);
    res.redirect(`${webOrigin}/dashboard?login=success`);
  } catch (error) { console.error('telegram callback:', error.response?.data || error.message); res.redirect(`${webOrigin}/?login=error&reason=${encodeURIComponent('Login Telegram gagal. Silakan coba lagi.')}`); }
});

app.get('/api/auth/status', async (req, res) => { try { const user = await userFromRequest(req); res.json({ success: true, authenticated: Boolean(user), user: user ? { id: user.id, telegramId: user.telegram_id, username: user.username, firstName: user.first_name, photoUrl: user.photo_url || null } : null }); } catch { fail(res, 500, 'Gagal membaca status login'); } });
app.post('/api/auth/logout', async (req, res) => { if (req.cookies.user_session) await pool.execute('DELETE FROM web_sessions WHERE id=?', [req.cookies.user_session]); res.clearCookie('user_session'); res.json({ success: true }); });

require('./transactionReports').registerTransactionReports(app, pool, requireUser);

app.get('/api/dashboard', requireUser, async (req, res) => {
  const [userRows] = await pool.execute("SELECT active_provider FROM users WHERE id=?", [req.user.id]);
  const activeProvider = userRows[0]?.active_provider === 'shopeepay' ? 'shopeepay' : 'gopay';

  const [gopay] = await pool.execute("SELECT phone_number, merchant_id, merchant_name, owner_name, encrypted_session, status, last_error, updated_at FROM gopay_accounts WHERE user_id=?", [req.user.id]);
  const [qris] = await pool.execute('SELECT static_qris, is_valid, updated_at FROM qris_configs WHERE user_id=?', [req.user.id]);
  const [shopee] = await pool.execute("SELECT phone_number, merchant_id, merchant_name, store_id, store_name, encrypted_session, status, last_error, updated_at FROM shopee_accounts WHERE user_id=?", [req.user.id]);
  const [shopeeQris] = await pool.execute('SELECT static_qris, is_valid, updated_at FROM shopee_qris_configs WHERE user_id=?', [req.user.id]);
  const [key] = await pool.execute('SELECT key_prefix, service_type, created_at, rotated_at FROM api_keys WHERE user_id=?', [req.user.id]);
  const [webhook] = await pool.execute('SELECT webhook_url, secret, is_active, updated_at FROM webhook_configs WHERE user_id=?', [req.user.id]);

  let gopayData = gopay[0] || { status: 'disconnected' };
  if (gopayData.status === 'otp_pending' && !hasPendingOtp(req.user.id)) {
    await pool.execute("UPDATE gopay_accounts SET status='disconnected' WHERE user_id=? AND status='otp_pending'", [req.user.id]);
    gopayData.status = 'disconnected';
  }
  // If connected but merchant_name / owner_name is not yet populated, backfill once from session
  if (gopayData.status === 'connected' && (!gopayData.merchant_name || !gopayData.owner_name) && gopayData.encrypted_session) {
    try {
      const session = JSON.parse(decrypt(gopayData.encrypted_session));
      const profile = await fetchMerchantProfile(session);
      if (profile && (profile.merchantName || profile.ownerName)) {
        await pool.execute(
          'UPDATE gopay_accounts SET merchant_name = COALESCE(?, merchant_name), owner_name = COALESCE(?, owner_name) WHERE user_id = ?',
          [profile.merchantName, profile.ownerName, req.user.id]
        );
        gopayData.merchant_name = profile.merchantName || gopayData.merchant_name;
        gopayData.owner_name = profile.ownerName || gopayData.owner_name;
      }
    } catch (e) {
      // non-blocking
    }
  }

  let shopeeData = shopee[0] || { status: 'disconnected' };
  if (shopeeData.status === 'otp_pending' && !pendingShopeeChallenges.has(req.user.id)) {
    await pool.execute("UPDATE shopee_accounts SET status='disconnected' WHERE user_id=? AND status='otp_pending'", [req.user.id]);
    shopeeData.status = 'disconnected';
  }

  // Remove encrypted_session from response payload
  const { encrypted_session, ...sanitizedGopay } = gopayData;
  const { encrypted_session: shopeeEncSession, ...sanitizedShopee } = shopeeData;

  res.json({
    success: true,
    user: { ...req.user, activeProvider },
    activeProvider,
    gopay: sanitizedGopay,
    qris: qris[0] ? { configured: true, isValid: Boolean(qris[0].is_valid), updatedAt: qris[0].updated_at, staticQris: qris[0].static_qris } : { configured: false },
    shopee: sanitizedShopee,
    shopeeQris: shopeeQris[0] ? { configured: true, isValid: Boolean(shopeeQris[0].is_valid), updatedAt: shopeeQris[0].updated_at, staticQris: shopeeQris[0].static_qris } : { configured: false },
    apiKey: key[0] || null,
    webhook: webhook[0] ? { url: webhook[0].webhook_url, secret: webhook[0].secret, isActive: Boolean(webhook[0].is_active), updatedAt: webhook[0].updated_at } : null
  });
});

app.get('/api/api-key', requireUser, async (req, res) => {
  const [rows] = await pool.execute('SELECT encrypted_key, key_prefix, service_type, created_at, rotated_at FROM api_keys WHERE user_id=?', [req.user.id]);
  if (!rows[0]) return fail(res, 404, 'API key belum dibuat');
  res.json({
    success: true,
    apiKey: {
      key: decrypt(rows[0].encrypted_key),
      prefix: rows[0].key_prefix,
      serviceType: rows[0].service_type || 'website',
      createdAt: rows[0].created_at,
      rotatedAt: rows[0].rotated_at
    }
  });
});

app.post('/api/api-key', requireUser, async (req, res) => {
  const serviceType = ['website', 'bot'].includes(req.body?.serviceType) ? req.body.serviceType : 'website';
  const key = randomApiKey();
  await pool.execute(
    'INSERT INTO api_keys (user_id, service_type, encrypted_key, key_prefix, key_hash) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE service_type=VALUES(service_type), encrypted_key=VALUES(encrypted_key), key_prefix=VALUES(key_prefix), key_hash=VALUES(key_hash), rotated_at=NOW()',
    [req.user.id, serviceType, encrypt(key), key.slice(0, 12), crypto.createHash('sha256').update(key).digest('hex')]
  );
  await audit(req.user.id, 'api_key_created_or_rotated', { serviceType });
  res.json({
    success: true,
    apiKey: {
      key,
      prefix: key.slice(0, 12),
      serviceType
    }
  });
});

app.get('/api/webhook', requireUser, async (req, res) => {
  const [rows] = await pool.execute('SELECT webhook_url, secret, is_active, updated_at FROM webhook_configs WHERE user_id=?', [req.user.id]);
  if (!rows[0]) {
    return res.json({ success: true, webhook: null });
  }
  return res.json({
    success: true,
    webhook: {
      url: rows[0].webhook_url,
      secret: rows[0].secret,
      isActive: Boolean(rows[0].is_active),
      updatedAt: rows[0].updated_at
    }
  });
});

app.post('/api/webhook', requireUser, async (req, res) => {
  const { url, secret, isActive = true } = req.body || {};
  if (!url || typeof url !== 'string' || !url.trim()) {
    await pool.execute('DELETE FROM webhook_configs WHERE user_id=?', [req.user.id]);
    await audit(req.user.id, 'webhook_deleted');
    return res.json({ success: true, webhook: null, message: 'Webhook dinonaktifkan' });
  }

  const cleanUrl = url.trim();
  const validation = validateWebhookUrl(cleanUrl, { allowInsecureHttp: !isProduction });
  if (!validation.valid) {
    return fail(res, 400, validation.error);
  }

  const currentSecret = typeof secret === 'string' && secret.trim()
    ? secret.trim()
    : crypto.randomBytes(16).toString('hex');

  await pool.execute(
    'INSERT INTO webhook_configs (user_id, webhook_url, secret, is_active) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE webhook_url=VALUES(webhook_url), secret=VALUES(secret), is_active=VALUES(is_active)',
    [req.user.id, cleanUrl, currentSecret, isActive ? 1 : 0]
  );
  await audit(req.user.id, 'webhook_configured', { url: cleanUrl });

  return res.json({
    success: true,
    webhook: {
      url: cleanUrl,
      secret: currentSecret,
      isActive: Boolean(isActive)
    },
    message: 'Webhook berhasil disimpan'
  });
});

app.post('/api/webhook/test', requireUser, async (req, res) => {
  const [rows] = await pool.execute('SELECT webhook_url, secret FROM webhook_configs WHERE user_id=? LIMIT 1', [req.user.id]);
  const targetUrl = req.body?.url?.trim() || rows[0]?.webhook_url;
  const secret = req.body?.secret?.trim() || rows[0]?.secret || crypto.randomBytes(16).toString('hex');

  if (!targetUrl) {
    return fail(res, 400, 'Belum ada Webhook URL yang diatur untuk diuji coba');
  }

  const validation = validateWebhookUrl(targetUrl, { allowInsecureHttp: !isProduction });
  if (!validation.valid) {
    return fail(res, 400, validation.error);
  }

  const testPayload = {
    event: 'webhook.test',
    timestamp: new Date().toISOString(),
    data: {
      message: 'Uji coba pengiriman webhook dari AlternatePay berhasil diterima.',
      testTrxId: crypto.randomUUID(),
      user: req.user.username || req.user.first_name || 'Merchant'
    }
  };

  const result = await sendWebhook({
    url: targetUrl,
    secret,
    payload: testPayload,
    timeoutMs: 8000,
    eventName: 'webhook.test'
  });

  return res.json({
    success: result.success,
    statusCode: result.statusCode,
    statusText: result.statusText,
    responseTimeMs: result.responseTimeMs,
    responseBody: result.responseBody,
    error: result.error
  });
});

const pollingUsers = new Set();
const pollingTimer = setInterval(() => {
  pool.execute("SELECT user_id FROM gopay_accounts WHERE status='connected'")
    .then(([rows]) => rows.forEach(({ user_id: userId }) => {
      if (pollingUsers.has(`gopay:${userId}`)) return;
      pollingUsers.add(`gopay:${userId}`);
      pollMerchantPayments(userId)
        .catch((error) => console.error('GoPay payment polling failed:', error.message))
        .finally(() => pollingUsers.delete(`gopay:${userId}`));
    }))
    .catch((error) => console.error('GoPay poll scheduler failed:', error.message));

  pool.execute("SELECT user_id FROM shopee_accounts WHERE status='connected'")
    .then(([rows]) => rows.forEach(({ user_id: userId }) => {
      if (pollingUsers.has(`shopee:${userId}`)) return;
      pollingUsers.add(`shopee:${userId}`);
      pollShopeePayments(userId)
        .catch((error) => console.error('Shopee payment polling failed:', error.message))
        .finally(() => pollingUsers.delete(`shopee:${userId}`));
    }))
    .catch((error) => console.error('Shopee poll scheduler failed:', error.message));
}, DEFAULT_PAYMENT_INTERVAL_MS);
pollingTimer.unref();

const requirePositiveId = z.string().trim().min(1).max(128);
const createPaymentSchema = z.object({
  orderId: requirePositiveId,
  amount: z.coerce.number().int().positive().max(MAX_PAYABLE_AMOUNT - PAYMENT_MIN_SURCHARGE),
  idempotencyKey: z.string().trim().min(1).max(128).optional(),
  webhookUrl: z.string().trim().max(1024).refine((val) => {
    if (!val) return true;
    const res = validateWebhookUrl(val, { allowInsecureHttp: !isProduction });
    return res.valid;
  }, {
    message: isProduction
      ? 'Webhook URL wajib berupa URL HTTPS publik yang valid (bukan localhost/IP internal)'
      : 'Webhook URL harus berupa URL publik yang valid (bukan localhost/IP internal)'
  }).optional()
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
    // Check user active_provider
    const [[userRow]] = await connection.execute("SELECT active_provider FROM users WHERE id=? LIMIT 1", [userId]);
    const activeProvider = userRow?.active_provider === 'shopeepay' ? 'shopeepay' : 'gopay';

    let staticQrisPayload = '';
    if (activeProvider === 'shopeepay') {
      const [[shopeeAcc]] = await connection.execute("SELECT merchant_id, status FROM shopee_accounts WHERE user_id=? FOR UPDATE", [userId]);
      if (!shopeeAcc || shopeeAcc.status !== 'connected') {
        const error = new Error('Akun ShopeePay Merchant belum terhubung');
        error.statusCode = 409;
        throw error;
      }
      const [shopeeConfigs] = await connection.execute('SELECT static_qris FROM shopee_qris_configs WHERE user_id=? AND is_valid=1', [userId]);
      if (!shopeeConfigs[0]) {
        const error = new Error('Simpan QRIS ShopeePay Merchant terlebih dahulu');
        error.statusCode = 409;
        throw error;
      }
      staticQrisPayload = shopeeConfigs[0].static_qris;
    } else {
      const [[account]] = await connection.execute("SELECT merchant_id, status FROM gopay_accounts WHERE user_id=? FOR UPDATE", [userId]);
      if (!account || account.status !== 'connected' || !account.merchant_id) {
        const error = new Error('Akun GoPay Merchant belum terhubung');
        error.statusCode = 409;
        throw error;
      }
      const [configs] = await connection.execute('SELECT static_qris FROM qris_configs WHERE user_id=? AND is_valid=1', [userId]);
      if (!configs[0]) {
        const error = new Error('Simpan QRIS GoPay Merchant terlebih dahulu');
        error.statusCode = 409;
        throw error;
      }
      staticQrisPayload = configs[0].static_qris;
    }

    const now = new Date();
    const [busyRows] = await connection.execute("SELECT payable_amount FROM payments WHERE user_id=? AND status='pending' AND reservation_until>? FOR UPDATE", [userId, now]);
    const allocation = allocateUniqueAmount(input.amount, new Set(busyRows.map((row) => Number(row.payable_amount))), PAYMENT_MIN_SURCHARGE, PAYMENT_MAX_SURCHARGE);
    const expiresAt = new Date(now.getTime() + PAYMENT_EXPIRY_MS);
    const reservationUntil = new Date(expiresAt.getTime() + 36 * 60 * 60 * 1000);
    const trxId = crypto.randomUUID();
    let initialWebhookUrl = input.webhookUrl || null;
    if (!initialWebhookUrl) {
      const [[userWebhook]] = await connection.execute('SELECT webhook_url FROM webhook_configs WHERE user_id=? AND is_active=1 LIMIT 1', [userId]);
      if (userWebhook && userWebhook.webhook_url) {
        initialWebhookUrl = userWebhook.webhook_url;
      }
    }
    const qrisPayload = generateDynamicQRIS(staticQrisPayload, allocation.payableAmount);
    await connection.execute("INSERT INTO payments (id,user_id,order_id,idempotency_key,base_amount,surcharge,payable_amount,qris_payload,provider,status,expires_at,reservation_until,webhook_url) VALUES (?,?,?,?,?,?,?,?,?,'pending',?,?,?)", [trxId,userId,input.orderId,idempotencyKey,input.amount,allocation.surcharge,allocation.payableAmount,qrisPayload,activeProvider,expiresAt,reservationUntil,initialWebhookUrl]);
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
  if (!parsed.success) return fail(res, 400, 'orderId, amount, atau idempotencyKey tidak valid');
  try {
    const result = await createPaymentForUser(req.apiUserId, parsed.data);
    return res.status(result.created ? 201 : 200).json({ success: true, payment: safePaymentStatus(result.row) });
  } catch (error) {
    return fail(res, error.statusCode || 500, error.statusCode ? error.message : 'Gagal membuat QRIS payment');
  }
});

async function cancelPaymentForUser(userId, trxId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[existing]] = await connection.execute('SELECT * FROM payments WHERE id=? AND user_id=? LIMIT 1 FOR UPDATE', [trxId, userId]);
    if (!existing) {
      await connection.rollback();
      const err = new Error('Payment tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }
    if (existing.status === 'paid') {
      await connection.rollback();
      const err = new Error('Transaksi sudah dibayar dan tidak dapat dibatalkan');
      err.statusCode = 409;
      throw err;
    }
    if (existing.status === 'expired') {
      await connection.rollback();
      const err = new Error('Transaksi sudah kedaluwarsa');
      err.statusCode = 409;
      throw err;
    }
    if (existing.status === 'cancelled') {
      await connection.commit();
      return existing;
    }
    if (new Date(existing.expires_at).getTime() <= Date.now()) {
      await connection.execute("UPDATE payments SET status='expired' WHERE id=? AND user_id=? AND status='pending'", [trxId, userId]);
      await connection.commit();
      const err = new Error('Transaksi sudah kedaluwarsa');
      err.statusCode = 409;
      throw err;
    }
    await connection.execute("UPDATE payments SET status='cancelled', reservation_until=NOW(3) WHERE id=? AND user_id=? AND status='pending'", [trxId, userId]);
    const [[updated]] = await connection.execute('SELECT * FROM payments WHERE id=? AND user_id=? LIMIT 1', [trxId, userId]);
    await connection.commit();
    await audit(userId, 'payment_cancelled', { trxId: updated.id, orderId: updated.order_id, amount: Number(updated.payable_amount) });
    return updated;
  } catch (error) {
    try { await connection.rollback(); } catch {}
    throw error;
  } finally {
    connection.release();
  }
}

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

app.post('/api/v1/payments/:trxId/cancel', apiKeyAuth, async (req, res) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.trxId)) return fail(res, 400, 'trxId tidak valid');
  try {
    const payment = await cancelPaymentForUser(req.apiUserId, req.params.trxId);
    return res.json({ success: true, payment: safePaymentStatus(payment) });
  } catch (error) {
    return fail(res, error.statusCode || 500, error.statusCode ? error.message : 'Gagal membatalkan transaksi');
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

app.post('/api/merchant/provider', requireUser, async (req, res) => {
  const parsed = z.object({ provider: z.enum(['gopay', 'shopeepay']) }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, 'Provider harus gopay atau shopeepay');
  await pool.execute('UPDATE users SET active_provider=? WHERE id=?', [parsed.data.provider, req.user.id]);
  await audit(req.user.id, 'provider_switched', { provider: parsed.data.provider });
  res.json({ success: true, activeProvider: parsed.data.provider });
});

const shopeeQrisSchema = z.object({ staticQris: z.string().trim().min(20).max(1000) });
app.put('/api/shopee/qris', requireUser, async (req, res) => {
  const parsed = shopeeQrisSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, 'QRIS tidak valid atau terlalu pendek');
  let staticQris;
  try {
    staticQris = validateQris(parsed.data.staticQris);
  } catch (error) {
    return fail(res, 400, error.message);
  }
  await pool.execute(
    'INSERT INTO shopee_qris_configs (user_id, static_qris, is_valid) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE static_qris=VALUES(static_qris), is_valid=1',
    [req.user.id, staticQris]
  );
  await audit(req.user.id, 'shopee_qris_updated');
  res.json({ success: true });
});

app.delete('/api/shopee/qris', requireUser, async (req, res) => {
  await pool.execute('DELETE FROM shopee_qris_configs WHERE user_id=?', [req.user.id]);
  await audit(req.user.id, 'shopee_qris_deleted');
  res.json({ success: true });
});

app.post('/api/shopee/connect/start', requireUser, async (req, res) => {
  const parsed = z.object({
    phoneNumber: z.string().trim().min(8).max(20),
    password: z.string().min(1).max(100),
    channel: z.number().int().optional()
  }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, 'Nomor HP atau password tidak valid');

  try {
    const result = await requestShopeeOtp(parsed.data.phoneNumber, parsed.data.password, { channel: parsed.data.channel || 3 });
    pendingShopeeChallenges.set(req.user.id, {
      phoneNumber: parsed.data.phoneNumber,
      password: parsed.data.password,
      challenge: result,
      channel: result.channel,
      expiresAt: Date.now() + 10 * 60 * 1000
    });
    await pool.execute(
      "INSERT INTO shopee_accounts (user_id, phone_number, status) VALUES (?, ?, 'otp_pending') ON DUPLICATE KEY UPDATE phone_number=VALUES(phone_number), status='otp_pending', last_error=NULL",
      [req.user.id, parsed.data.phoneNumber]
    );
    await audit(req.user.id, 'shopee_otp_requested');
    return res.json({
      success: true,
      status: 'otp_pending',
      channel: result.channel,
      availableChannels: result.availableChannels || []
    });
  } catch (error) {
    console.error('shopee otp start error:', error.message);
    return fail(res, 502, error.message || 'Gagal meminta OTP Shopee');
  }
});

app.post('/api/shopee/connect/verify', requireUser, async (req, res) => {
  const parsed = z.object({ otp: z.string().trim().min(4).max(10) }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, 'Kirim kode OTP sebagai teks');

  const pending = pendingShopeeChallenges.get(req.user.id);
  if (!pending || Date.now() > pending.expiresAt) {
    pendingShopeeChallenges.delete(req.user.id);
    return fail(res, 400, 'Sesi verifikasi telah kedaluwarsa. Silakan minta OTP kembali.');
  }

  try {
    const verifyResult = await verifyShopeeOtp(pending.challenge, parsed.data.otp);
    // Find merchant from detected list
    const merchant = verifyResult.merchants?.[0];
    if (!merchant) {
      throw new Error('Tidak ada merchant yang ditemukan pada akun Shopee ini');
    }
    const loginResult = await completeShopeeLogin(verifyResult, merchant.id);
    pendingShopeeChallenges.delete(req.user.id);

    const resolvedMerchantId = loginResult.merchant?.id || merchant.id;
    const resolvedMerchantName = loginResult.merchant?.name || merchant.name || '';

    if (loginResult.stores && loginResult.stores.length > 1) {
      // Store pending selection in memory
      pendingShopeeVerifications.set(req.user.id, {
        verification: verifyResult,
        stores: loginResult.stores,
        merchantId: resolvedMerchantId,
        merchantName: resolvedMerchantName,
        phoneNumber: pending.phoneNumber,
        expiresAt: Date.now() + 10 * 60 * 1000
      });
      return res.json({
        success: true,
        needStoreSelection: true,
        merchantId: resolvedMerchantId,
        merchantName: resolvedMerchantName,
        stores: loginResult.stores
      });
    }

    // Single store auto-selected
    await pool.execute(
      "UPDATE shopee_accounts SET phone_number=?, merchant_id=?, merchant_name=?, store_id=?, store_name=?, encrypted_session=?, status='connected', last_error=NULL WHERE user_id=?",
      [
        pending.phoneNumber,
        resolvedMerchantId,
        resolvedMerchantName,
        loginResult.storeId || '',
        loginResult.storeName || '',
        encrypt(JSON.stringify(loginResult)),
        req.user.id
      ]
    );
    await audit(req.user.id, 'shopee_connected', { merchantId: resolvedMerchantId, merchantName: resolvedMerchantName });
    return res.json({
      success: true,
      status: 'connected',
      merchantId: resolvedMerchantId,
      merchantName: resolvedMerchantName,
      storeId: loginResult.storeId || '',
      storeName: loginResult.storeName || '',
      phoneNumber: pending.phoneNumber
    });
  } catch (error) {
    console.error('shopee verify error:', error.message);
    await pool.execute("UPDATE shopee_accounts SET status='error', last_error=? WHERE user_id=?", [error.message.slice(0, 500), req.user.id]);
    return fail(res, 502, error.message || 'Verifikasi OTP Shopee gagal');
  }
});

app.post('/api/shopee/connect/select-store', requireUser, async (req, res) => {
  const parsed = z.object({ storeId: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, 'storeId diperlukan');

  const pending = pendingShopeeVerifications.get(req.user.id);
  if (!pending || Date.now() > pending.expiresAt) {
    pendingShopeeVerifications.delete(req.user.id);
    return fail(res, 400, 'Sesi pemilihan toko telah kedaluwarsa. Silakan ulangi koneksi.');
  }

  try {
    const loginResult = await completeShopeeLogin(pending.verification, pending.merchantId, parsed.data.storeId);
    const storeId = loginResult.storeId || parsed.data.storeId;
    const storeName = loginResult.storeName || '';
    pendingShopeeVerifications.delete(req.user.id);

    await pool.execute(
      "UPDATE shopee_accounts SET phone_number=?, merchant_id=?, merchant_name=?, store_id=?, store_name=?, encrypted_session=?, status='connected', last_error=NULL WHERE user_id=?",
      [
        pending.phoneNumber,
        pending.merchantId,
        pending.merchantName,
        storeId,
        storeName,
        encrypt(JSON.stringify(loginResult)),
        req.user.id
      ]
    );
    await audit(req.user.id, 'shopee_connected', { merchantId: pending.merchantId, storeId });
    return res.json({
      success: true,
      status: 'connected',
      merchantId: pending.merchantId,
      merchantName: pending.merchantName,
      storeId,
      storeName,
      phoneNumber: pending.phoneNumber
    });
  } catch (error) {
    return fail(res, 502, error.message || 'Gagal memilih toko Shopee');
  }
});

app.post('/api/shopee/connect/reset', requireUser, async (req, res) => {
  pendingShopeeChallenges.delete(req.user.id);
  pendingShopeeVerifications.delete(req.user.id);
  await pool.execute("UPDATE shopee_accounts SET status='disconnected', last_error=NULL WHERE user_id=? AND status='otp_pending'", [req.user.id]);
  return res.json({ success: true, status: 'disconnected' });
});

app.post('/api/shopee/logout', requireUser, async (req, res) => {
  pendingShopeeChallenges.delete(req.user.id);
  pendingShopeeVerifications.delete(req.user.id);
  await pool.execute(
    "UPDATE shopee_accounts SET phone_number=NULL, merchant_id=NULL, merchant_name=NULL, store_id=NULL, store_name=NULL, encrypted_session=NULL, status='disconnected', last_error=NULL WHERE user_id=?",
    [req.user.id]
  );
  await pool.execute('DELETE FROM shopee_qris_configs WHERE user_id=?', [req.user.id]);
  // If active_provider was shopeepay, fallback to gopay
  await pool.execute("UPDATE users SET active_provider='gopay' WHERE id=? AND active_provider='shopeepay'", [req.user.id]);
  await audit(req.user.id, 'shopee_disconnected');
  return res.json({ success: true, status: 'disconnected' });
});

app.post('/api/gopay/connect/start', requireUser, async (req, res) => {
  const parsed = z.object({ phoneNumber: z.string().trim().min(8).max(20) }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, 'Nomor GoPay tidak valid');
  try {
    const result = await requestOtp(req.user.id, parsed.data.phoneNumber);
    await pool.execute('INSERT INTO gopay_accounts (user_id, phone_number, status) VALUES (?, ?, \'otp_pending\') ON DUPLICATE KEY UPDATE phone_number=VALUES(phone_number), status=\'otp_pending\', last_error=NULL', [req.user.id, parsed.data.phoneNumber]);
    await audit(req.user.id, 'gopay_otp_requested');
    return res.json({ success: true, status: 'otp_pending', expiresIn: result.expiresIn });
  } catch (error) {
    console.error('gopay otp start:', error.response?.status || '', error.response?.data || error.message);
    if (error.statusCode === 429) return fail(res, 429, error.message);
    if (error.message && error.message.includes('Nomor GoPay')) return fail(res, 400, error.message);
    return fail(res, 502, 'GoBiz menolak request OTP. Perbarui aplikasi GoPay Merchant atau coba lagi nanti.');
  }
});

app.post('/api/gopay/connect/verify', requireUser, async (req, res) => {
  const parsed = z.object({ otp: z.string() }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, 'Kirim kode OTP sebagai teks');
  try {
    const result = await verifyOtp(req.user.id, parsed.data.otp);
    await pool.execute(
      'UPDATE gopay_accounts SET phone_number=?, merchant_id=?, merchant_name=?, owner_name=?, encrypted_session=?, status=\'connected\', last_error=NULL WHERE user_id=?',
      [result.phoneNumber, result.merchantId, result.merchantName, result.ownerName, encrypt(JSON.stringify(result.session)), req.user.id]
    );
    await audit(req.user.id, 'gopay_connected', { merchantId: result.merchantId, merchantName: result.merchantName });
    return res.json({ success: true, status: 'connected', merchantId: result.merchantId, merchantName: result.merchantName, ownerName: result.ownerName, phoneNumber: result.phoneNumber });
  } catch (error) {
    await pool.execute('UPDATE gopay_accounts SET status=\'error\', last_error=? WHERE user_id=?', [error.message.slice(0, 500), req.user.id]);
    return fail(res, 502, error.message);
  }
});

app.post('/api/gopay/connect/reset', requireUser, async (req, res) => {
  clearPendingOtp(req.user.id);
  await pool.execute("UPDATE gopay_accounts SET status='disconnected', last_error=NULL WHERE user_id=? AND status='otp_pending'", [req.user.id]);
  return res.json({ success: true, status: 'disconnected' });
});

app.post('/api/gopay/logout', requireUser, async (req, res) => {
  clearPendingOtp(req.user.id);
  await pool.execute(
    "UPDATE gopay_accounts SET phone_number=NULL, merchant_id=NULL, merchant_name=NULL, owner_name=NULL, encrypted_session=NULL, status='disconnected', last_error=NULL WHERE user_id=?",
    [req.user.id]
  );
  await pool.execute('DELETE FROM qris_configs WHERE user_id=?', [req.user.id]);
  await audit(req.user.id, 'gopay_disconnected');
  return res.json({ success: true, status: 'disconnected' });
});

app.get('/api/activity', requireUser, async (req, res) => { const [rows] = await pool.execute('SELECT action, metadata, created_at FROM activity_logs WHERE user_id=? ORDER BY id DESC LIMIT 50', [req.user.id]); res.json({ success: true, items: rows }); });

app.use((error, _req, res, _next) => { console.error('unhandled:', error); fail(res, 500, 'Terjadi kesalahan internal'); });

async function startServer() {
  try {
    await applyMigrations(pool);
    console.log('Database tables & columns verified/migrated successfully');
  } catch (err) {
    console.error('Failed to run initial database migration:', err.message);
  }

  app.listen(port, () => console.log(`Platform API listening on ${port}`));
}

startServer();
