const crypto = require('crypto');
const axios = require('axios');

const AUTH_URL = 'https://api.gobiz.co.id/goid';
const OTP_URL = `${AUTH_URL}/login/request`;
const TOKEN_URL = `${AUTH_URL}/token`;
const PROFILE_URL = 'https://api.gobiz.co.id/goresto/v5/public/users/config';
const CLIENT_ID = 'go-biz-web-new';
const APP_VERSION = process.env.GOPAY_APP_VERSION || 'platform-v3.125.0-e1923971';
const OTP_TTL_MS = 10 * 60 * 1000;

const pending = new Map();

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  const local = digits.replace(/^62/, '').replace(/^0/, '');
  if (!/^8\d{7,13}$/.test(local)) throw new Error('Nomor GoPay/GoBiz tidak valid');
  return local;
}

function headers(deviceId, accessToken) {
  return {
    accept: 'application/json, text/plain, */*',
    'accept-language': 'id',
    'authentication-type': 'go-id',
    'content-type': 'application/json',
    'gojek-country-code': 'ID',
    'gojek-timezone': 'Asia/Jakarta',
    origin: 'https://portal.gofoodmerchant.co.id',
    referer: 'https://portal.gofoodmerchant.co.id/',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150 Safari/537.36',
    'x-appid': 'go-biz-web-dashboard',
    'x-appversion': APP_VERSION,
    'x-deviceos': 'Web',
    'x-phonemake': 'Windows 10 64-bit',
    'x-phonemodel': 'Chrome 148 on Windows 10 64-bit',
    'x-platform': 'Web',
    'x-uniqueid': deviceId,
    'x-user-locale': 'en-GB',
    'x-user-type': 'merchant',
    ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {})
  };
}

function responseData(response) {
  const body = response?.data || {};
  return body.data || body;
}

function expire(userId) {
  const item = pending.get(userId);
  if (item && item.expiresAt <= Date.now()) pending.delete(userId);
}

async function requestOtp(userId, phoneNumber) {
  expire(userId);
  if (pending.has(userId)) throw new Error('OTP sebelumnya masih aktif. Tunggu sampai kedaluwarsa.');
  const phone = normalizePhone(phoneNumber);
  const deviceId = crypto.randomUUID();
  const response = await axios.post(OTP_URL, { client_id: CLIENT_ID, phone_number: phone, country_code: '62' }, { headers: headers(deviceId), timeout: 15000 });
  const data = responseData(response);
  const otpToken = data.otp_token || data.login_token;
  if (!otpToken) throw new Error('GoBiz tidak mengembalikan token OTP');
  pending.set(userId, { phone, deviceId, otpToken, expiresAt: Date.now() + OTP_TTL_MS });
  return { expiresIn: Math.floor(OTP_TTL_MS / 1000) };
}

async function verifyOtp(userId, otp) {
  expire(userId);
  const item = pending.get(userId);
  if (!item) throw new Error('OTP tidak ditemukan atau sudah kedaluwarsa');

  try {
    const response = await axios.post(TOKEN_URL, { client_id: CLIENT_ID, grant_type: 'otp', data: { otp: String(otp), otp_token: item.otpToken } }, { headers: headers(item.deviceId), timeout: 15000 });
    const data = responseData(response);
    if (!data.access_token || !data.refresh_token) throw new Error('GoBiz tidak mengembalikan session token lengkap');
    const profileResponse = await axios.get(PROFILE_URL, { headers: headers(item.deviceId, data.access_token), timeout: 15000 });
    const profile = responseData(profileResponse);
    const merchant = profile.merchant || profile.merchants?.[0] || profile.restaurants?.[0];
    const merchantId = merchant?.id || profile.merchant_id || data.merchant_id;
    if (!merchantId) throw new Error('Merchant GoPay tidak ditemukan');
    const merchantName = merchant?.outlet_name || merchant?.name || null;
    const ownerName = profile.user?.full_name || profile.user?.name || null;
    pending.delete(userId);
    return {
      phoneNumber: `+62${item.phone}`,
      merchantId: String(merchantId),
      merchantName: merchantName ? String(merchantName) : null,
      ownerName: ownerName ? String(ownerName) : null,
      session: {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        device_id: item.deviceId,
        phone_number: `+62${item.phone}`,
        expires_at: Date.now() + Number(data.expires_in || 86400) * 1000
      }
    };
  } catch (error) {
    if (error.response?.status >= 400 && error.response?.status < 500) pending.delete(userId);
    throw new Error(error.response?.data?.message || error.message || 'Verifikasi GoPay gagal');
  }
}

async function refreshSession(session) {
  if (!session?.refresh_token) throw new Error('Sesi GoPay tidak memiliki refresh token');
  const response = await axios.post(TOKEN_URL, {
    client_id: CLIENT_ID,
    grant_type: 'refresh_token',
    data: { refresh_token: session.refresh_token, phone_number: String(session.phone_number || '').replace(/^\\+?62/, '').replace(/^0/, ''), country_code: '62' }
  }, { headers: headers(session.device_id), timeout: 15000 });
  const data = responseData(response);
  if (!data.access_token) throw new Error('GoBiz tidak mengembalikan access token saat refresh');
  return {
    ...session,
    access_token: data.access_token,
    refresh_token: data.refresh_token || session.refresh_token,
    expires_at: Date.now() + Number(data.expires_in || 86400) * 1000
  };
}

async function listTransactions(session, { merchantId, startTime, endTime }) {
  if (!merchantId) throw new Error('Merchant GoPay tidak memiliki merchant ID');
  let activeSession = session;
  const transactions = [];
  for (let from = 0; from < 1000; from += 100) {
    const fetchPage = (currentSession) => axios.get('https://api.gojekapi.com/merchant-analytics/v2/merchants/transactions', {
      headers: headers(currentSession.device_id, currentSession.access_token),
      params: {
        from,
        size: 100,
        statuses: 'SETTLEMENT,CAPTURE',
        payment_types: 'QRIS',
        start_time: startTime,
        end_time: endTime,
        merchant_ids: merchantId
      },
      timeout: 12000
    });
    let response;
    try {
      response = await fetchPage(activeSession);
    } catch (error) {
      if (error.response?.status !== 401) throw error;
      activeSession = await refreshSession(activeSession);
      response = await fetchPage(activeSession);
    }
    const body = response.data || {};
    const payload = body.data || body;
    const page = Array.isArray(body.transactions) ? body.transactions
      : Array.isArray(payload.transactions) ? payload.transactions
        : Array.isArray(payload) ? payload
          : [];
    transactions.push(...page);
    if (page.length < 100) break;
  }
  return { transactions, session: activeSession };
}

async function fetchMerchantProfile(session) {
  if (!session?.access_token) return null;
  try {
    const response = await axios.get(PROFILE_URL, { headers: headers(session.device_id, session.access_token), timeout: 15000 });
    const profile = responseData(response);
    const merchant = profile.merchant || profile.merchants?.[0] || profile.restaurants?.[0];
    const merchantId = merchant?.id || profile.merchant_id;
    const merchantName = merchant?.outlet_name || merchant?.name || null;
    const ownerName = profile.user?.full_name || profile.user?.name || null;
    return {
      merchantId: merchantId ? String(merchantId) : null,
      merchantName: merchantName ? String(merchantName) : null,
      ownerName: ownerName ? String(ownerName) : null
    };
  } catch (error) {
    return null;
  }
}

module.exports = { requestOtp, verifyOtp, listTransactions, refreshSession, fetchMerchantProfile };