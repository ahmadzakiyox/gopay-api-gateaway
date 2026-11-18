require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
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
const { requestOtp, verifyOtp } = require('./gopayAdapter');

const app = express();
const port = Number(process.env.PLATFORM_PORT || 3100);
const webOrigin = process.env.WEB_ORIGIN || 'http://localhost:5173';
const isProduction = process.env.NODE_ENV === 'production';
const pool = mysql.createPool({ host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT || 3306), user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, database: process.env.MYSQL_DATABASE, connectionLimit: 10 });
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
app.post('/api/api-key', requireUser, async (req, res) => { const key = randomApiKey(); await pool.execute('INSERT INTO api_keys (user_id, encrypted_key, key_prefix) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE encrypted_key=VALUES(encrypted_key), key_prefix=VALUES(key_prefix), rotated_at=NOW()', [req.user.id, encrypt(key), key.slice(0, 12)]); await audit(req.user.id, 'api_key_created_or_rotated'); res.json({ success: true, apiKey: { key, prefix: key.slice(0, 12) } }); });

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
  const parsed = z.object({ otp: z.string().trim().regex(/^\\d{4,8}$/) }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, 'OTP harus berupa 4 sampai 8 digit');
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
