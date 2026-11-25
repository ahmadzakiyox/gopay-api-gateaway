const axios = require('axios');
const crypto = require('crypto');
const {
  AccountBaseURL,
  PartnerBaseURL,
  PartnerAPIBaseURL,
  PayBaseURL,
  DeviceFingerprintURL,
  SZSDKVersion,
  EPCheckPasswordMigration,
  EPCheckAccountByPassword,
  EPAuthenticateByPassword,
  EPOtpSettings,
  EPSendOtp,
  EPVerifyOtp,
  EPAuthenticateByOtp,
  EPLoginToc,
  EPLoginStatus,
  EPMerchantDetect,
  EPAccountLogin,
  EPAccountLoginToken,
  EPAccountTobAuth,
  EPPartnerLoginAuth,
  EPStores,
  EPTransactions,
  DefaultLanguage,
  DefaultTimezone,
  BusinessClientID,
  AccountClientID,
  PartnerLoginFrom,
  LiveTokenCookie,
  ClientIDCookie,
  AuthErrorNeedOTP,
  InvalidTokenCodes,
  DeviceRiskBlob,
  TransactionServices,
  StoreServices,
  StorePageSize
} = require('./shopeeConstants');

const {
  ShopeeCookieJar
} = require('./shopeeCookieJar');

const {
  hashShopeePassword,
  parseIndonesianPhone,
  formatPhoneForVerification,
  decodeJwtPayload,
  parseShopeeAmount
} = require('./shopeeCrypto');

const BrowserHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:153.0) Gecko/20100101 Firefox/153.0',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'id,en-US;q=0.9,en;q=0.8',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-site'
};

function partnerState() {
  const loginAuthURL = `${PartnerBaseURL}${EPPartnerLoginAuth}`;
  const u = new URL(PartnerBaseURL + '/');
  u.searchParams.set('business_next', loginAuthURL);
  u.searchParams.set('business_state', PartnerBaseURL);
  u.searchParams.set('business_client_id', BusinessClientID);
  return u.toString();
}

function loginReferer(businessNext) {
  const u = new URL(`${AccountBaseURL}/authenticate/login/`);
  u.searchParams.set('lang', DefaultLanguage);
  u.searchParams.set('should_hide_back', 'true');

  const stateURL = new URL(PartnerBaseURL + '/');
  stateURL.searchParams.set('business_next', businessNext);
  stateURL.searchParams.set('business_state', PartnerBaseURL);
  stateURL.searchParams.set('business_client_id', BusinessClientID);

  u.searchParams.set('state', stateURL.toString());
  u.searchParams.set('client_id', AccountClientID);
  u.searchParams.set('next', `${PartnerBaseURL}${EPAccountLogin}`);
  return u.toString();
}

function accountHeaders(jar, riskToken) {
  const csrfToken = jar.get('csrftoken', AccountBaseURL);
  const referer = loginReferer(`${PartnerBaseURL}${EPPartnerLoginAuth}`);
  const h = {
    ...BrowserHeaders,
    'Origin': AccountBaseURL,
    'Referer': referer,
    'X-App-Type': '2',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'Priority': 'u=0'
  };
  if (riskToken) {
    h['af-ac-enc-sz-token'] = riskToken;
    h['x-sz-sdk-version'] = SZSDKVersion;
  }
  if (csrfToken) {
    h['X-CSRFToken'] = csrfToken;
  }
  return h;
}

function partnerHeaders(opts = {}) {
  const lang = opts.language || DefaultLanguage;
  const tz = opts.timezone || DefaultTimezone;
  const h = {
    ...BrowserHeaders,
    'Origin': PartnerBaseURL,
    'Referer': PartnerBaseURL + '/',
    'X-Merchant-ToB-Clientid': 'undefined',
    'X-Merchant-Login-From': PartnerLoginFrom,
    'X-Merchant-From': PartnerLoginFrom,
    'X-Merchant-Language': lang,
    'X-Merchant-Timezone': tz,
    'X-Merchant-RequestId': crypto.randomUUID(),
    'shopee-baggage': 'PFB=undefined',
    'X-Merchant-Token': opts.token || ''
  };
  if (opts.tocNonce) {
    h['X-Merchant-ToC-Nonce'] = opts.tocNonce;
  }
  return h;
}

function paymentHeaders() {
  return {
    ...BrowserHeaders,
    'Origin': PartnerBaseURL,
    'Referer': PartnerBaseURL + '/',
    'X-Timestamp-Ms': String(Date.now()),
    'X-Token': ''
  };
}

class ShopeeHttpClient {
  constructor(jar = null) {
    this.jar = jar || new ShopeeCookieJar();
  }

  async request(url, options = {}) {
    const method = options.method || 'GET';
    const reqHeaders = { ...options.headers };

    // Inject cookie if present
    const cookieHeader = this.jar.getCookieString(url);
    if (cookieHeader) {
      reqHeaders['Cookie'] = cookieHeader;
    }

    let data = options.data;
    if (data && typeof data === 'object' && !(data instanceof Buffer) && !(typeof data === 'string')) {
      if (!reqHeaders['Content-Type']) {
        reqHeaders['Content-Type'] = 'application/json';
      }
    }

    const response = await axios({
      url,
      method,
      headers: reqHeaders,
      data,
      params: options.params,
      maxRedirects: 0,
      validateStatus: status => status >= 200 && status < 400,
      timeout: options.timeout || 20000
    });

    // Store response cookies
    if (response.headers['set-cookie']) {
      this.jar.setCookiesFromHeaders(response.headers['set-cookie'], url);
    }

    return response;
  }

  async followGet(url, headers = {}) {
    let currentUrl = url;
    let hops = 0;
    while (hops < 10) {
      const resp = await this.request(currentUrl, { method: 'GET', headers });
      if (resp.status >= 300 && resp.status < 400 && resp.headers.location) {
        currentUrl = new URL(resp.headers.location, currentUrl).toString();
        hops++;
      } else {
        return resp;
      }
    }
    throw new Error('Too many redirects in followGet');
  }
}

/**
 * Acquire device risk token from Shopee security service
 */
async function acquireDeviceFingerprint(httpClient, deviceReport = DeviceRiskBlob) {
  const headers = {
    'Origin': AccountBaseURL,
    'Referer': AccountBaseURL + '/'
  };

  let body = {};
  if (deviceReport) {
    headers['Content-Type'] = 'text/plain;charset=UTF-8';
    headers['szdet'] = String(Date.now());
    body = deviceReport;
  } else {
    headers['Content-Type'] = 'application/json';
  }

  const resp = await httpClient.request(DeviceFingerprintURL, {
    method: 'POST',
    headers,
    data: body
  });

  const resData = resp.data || {};
  if (resData.code !== 0 || !resData.data?.riskToken) {
    throw new Error(`Shopee device-risk service error: ${resData.msg || 'No risk token'}`);
  }
  return resData.data.riskToken;
}

/**
 * Step 1: Request OTP from Shopee
 */
async function requestShopeeOtp(phoneNumber, password = '', opts = {}) {
  const phone = parseIndonesianPhone(phoneNumber);
  const client = new ShopeeHttpClient();

  // 1. Bootstrap anonymous account cookies
  await client.followGet(`${AccountBaseURL}/login?lang=${DefaultLanguage}`, {
    ...BrowserHeaders,
    'Accept': 'text/html'
  });

  // 2. Acquire device fingerprint
  const fingerprint = await acquireDeviceFingerprint(client);

  // 3. Migration check
  const migResp = await client.request(`${AccountBaseURL}${EPCheckPasswordMigration}`, {
    method: 'POST',
    headers: accountHeaders(client.jar, fingerprint),
    data: { phone }
  });
  if (migResp.data?.error !== 0) {
    throw new Error(migResp.data?.msg || `Shopee migration check failed (${migResp.data?.error})`);
  }

  // 4. Account existence check
  let hashed = '';
  if (password) {
    hashed = hashShopeePassword(password);
  }
  await client.request(`${AccountBaseURL}${EPCheckAccountByPassword}`, {
    method: 'POST',
    headers: accountHeaders(client.jar, fingerprint),
    data: { phone, password: hashed }
  });

  // 5. Authenticate by password step
  const authResp = await client.request(`${AccountBaseURL}${EPAuthenticateByPassword}`, {
    method: 'POST',
    headers: accountHeaders(client.jar, fingerprint),
    data: {
      phone,
      password: hashed,
      security_device_fingerprint: fingerprint
    }
  });

  let hasPassword = false;
  if (authResp.data?.error === AuthErrorNeedOTP) {
    if (!password) {
      throw new Error('Akun Shopee ini dilindungi password. Harap masukkan password akun Shopee kamu.');
    }
    hasPassword = true;
  } else if (authResp.data?.error === 0) {
    hasPassword = false;
  } else if (authResp.data?.data?.has_password) {
    throw new Error('Akun Shopee ini dilindungi password. Harap masukkan password akun Shopee kamu.');
  } else {
    throw new Error(authResp.data?.msg || `Shopee menolak verifikasi password (error ${authResp.data?.error})`);
  }

  // 6. Get OTP settings
  const settingsResp = await client.request(`${AccountBaseURL}${EPOtpSettings}`, {
    method: 'POST',
    headers: accountHeaders(client.jar, fingerprint),
    data: {
      operation: 50001,
      phone,
      security_device_fingerprint: fingerprint,
      support_session: false,
      supported_channels: [1, 2, 3, 5]
    }
  });
  if (settingsResp.data?.error !== 0) {
    throw new Error(settingsResp.data?.msg || `Gagal mengambil pengaturan OTP Shopee (${settingsResp.data?.error})`);
  }

  const rawChannels = settingsResp.data?.data?.available_channel_list || [];
  const availableChannels = Array.isArray(rawChannels) ? rawChannels.map(Number) : [];
  let channel = opts.channel || 0;
  if (!channel) {
    channel = Number(settingsResp.data?.data?.default_channel || 3);
  }
  if (availableChannels.length > 0 && !availableChannels.includes(channel)) {
    throw new Error(`Channel OTP ${channel === 3 ? 'WhatsApp' : 'SMS'} tidak tersedia untuk akun ini. Channel tersedia: ${availableChannels.map(c => c === 3 ? 'WhatsApp' : c === 1 ? 'SMS' : c).join(', ')}`);
  }

  // 7. Send OTP
  const sendResp = await client.request(`${AccountBaseURL}${EPSendOtp}`, {
    method: 'POST',
    headers: accountHeaders(client.jar, fingerprint),
    data: {
      operation: 50001,
      phone,
      security_device_fingerprint: fingerprint,
      support_session: false,
      supported_channels: [1, 2, 3, 5, 4],
      channel,
      captcha_signature: ''
    }
  });
  if (sendResp.data?.error !== 0) {
    throw new Error(sendResp.data?.msg || `Shopee gagal mengirimkan OTP (${sendResp.data?.error})`);
  }

  const seed = sendResp.data?.data?.seed || '';
  if (!seed) {
    console.warn(`[shopee-otp] Shopee reported success but returned empty seed for ${phone}. Delivery may be delayed or suppressed by Shopee fraud score.`);
  } else {
    console.log(`[shopee-otp] Shopee OTP sent successfully with delivery seed for ${phone}`);
  }

  return {
    version: 1,
    phoneNumber: phone,
    channel,
    seed,
    availableChannels,
    deviceFingerprint: fingerprint,
    hasPassword,
    cookies: client.jar.snapshot(),
    requestedAt: Date.now()
  };
}

/**
 * Step 2: Verify OTP code and return accessible merchants
 */
async function verifyShopeeOtp(challenge, otpCode) {
  if (!challenge || !challenge.cookies || !challenge.deviceFingerprint) {
    throw new Error('Challenge OTP tidak valid atau sudah kedaluwarsa');
  }
  const otp = String(otpCode || '').trim();
  if (!/^\d{4,10}$/.test(otp)) {
    throw new Error('Kode OTP harus berupa 4-10 digit angka');
  }

  const jar = new ShopeeCookieJar(challenge.cookies);
  const client = new ShopeeHttpClient(jar);
  const fingerprint = challenge.deviceFingerprint;

  // 1. Verify OTP
  const verifyResp = await client.request(`${AccountBaseURL}${EPVerifyOtp}`, {
    method: 'POST',
    headers: accountHeaders(jar, fingerprint),
    data: {
      operation: 50001,
      otp,
      phone: formatPhoneForVerification(challenge.phoneNumber),
      security_device_fingerprint: fingerprint,
      support_session: false
    }
  });
  if (verifyResp.data?.error !== 0 || !verifyResp.data?.data?.otp_token) {
    throw new Error(verifyResp.data?.msg || `Kode OTP tidak valid (${verifyResp.data?.error})`);
  }
  const otpToken = verifyResp.data.data.otp_token;

  // 2. Authenticate by OTP
  const authResp = await client.request(`${AccountBaseURL}${EPAuthenticateByOtp}`, {
    method: 'POST',
    headers: accountHeaders(jar, fingerprint),
    data: {
      otp_token: otpToken,
      security_device_fingerprint: fingerprint,
      is_signup: false
    }
  });
  if (authResp.data?.error !== 0) {
    throw new Error(authResp.data?.msg || `Gagal autentikasi OTP (${authResp.data?.error})`);
  }

  const tocNonce = authResp.data?.data?.toc_nonce;
  const tocAccount = authResp.data?.data?.toc_account || {};
  const tocUserId = tocAccount.userid;
  if (!tocNonce || !tocUserId) {
    throw new Error('Shopee mengembalikan session akun yang tidak lengkap');
  }

  let spcClientId = jar.get(ClientIDCookie, AccountBaseURL) || jar.get('spc_clientid', AccountBaseURL) || jar.get('SPC_CLIENTID', PartnerBaseURL) || jar.get('spc_clientid', PartnerBaseURL);
  if (!spcClientId) {
    // Generate UUID v4 format as fallback SPC_CLIENTID if cookie was omitted by Shopee response
    spcClientId = crypto.randomUUID();
    jar.setCookie({
      name: ClientIDCookie,
      value: spcClientId,
      domain: 'shopee.co.id',
      path: '/'
    });
  }

  // 3. Follow account login redirect
  const accountLoginUrl = new URL(`${PartnerBaseURL}${EPAccountLogin}`);
  accountLoginUrl.searchParams.set('lang', DefaultLanguage);
  accountLoginUrl.searchParams.set('spc_clientid', spcClientId);
  accountLoginUrl.searchParams.set('state', partnerState());
  accountLoginUrl.searchParams.set('toc_nonce', tocNonce);
  await client.followGet(accountLoginUrl.toString());

  // 4. Detect merchants
  const detectResp = await client.request(`${PartnerAPIBaseURL}${EPMerchantDetect}`, {
    method: 'POST',
    headers: partnerHeaders({ tocNonce }),
    data: {}
  });

  if (detectResp.data?.code !== 0) {
    throw new Error(detectResp.data?.message || `Gagal mendeteksi merchant Shopee (${detectResp.data?.code})`);
  }

  const selectMerchant = detectResp.data?.data?.selectMerchant;
  const rawList = selectMerchant?.merchantList || [];
  const merchants = rawList.map(m => {
    return {
      id: String(m.merchantId),
      name: m.merchantName || '',
      status: Number(m.merchantStatus || 0),
      staffUserId: Number(m.staffTobUid || 0),
      isActive: Boolean(m.isActive),
      isBanned: Boolean(m.isBanned)
    };
  }).filter(m => m.id && m.staffUserId);

  if (merchants.length === 0) {
    throw new Error('Akun Shopee kamu tidak memiliki merchant yang aktif atau dapat diakses');
  }

  return {
    version: 1,
    tocNonce,
    tocUserId,
    spcClientId,
    deviceFingerprint: fingerprint,
    cookies: jar.snapshot(),
    merchants,
    verifiedAt: Date.now()
  };
}

/**
 * Step 3: Complete login by selecting merchant & store
 */
async function completeShopeeLogin(verification, merchantId, selectedStoreId = '') {
  const merchant = (verification.merchants || []).find(m => m.id === String(merchantId));
  if (!merchant) {
    throw new Error(`Merchant ID ${merchantId} tidak ditemukan dalam akun`);
  }
  if (!merchant.isActive || merchant.isBanned) {
    throw new Error('Merchant Shopee yang dipilih sedang tidak aktif atau dibanned');
  }

  const jar = new ShopeeCookieJar(verification.cookies);
  const client = new ShopeeHttpClient(jar);

  // 1. Follow token page redirect
  const tokenPageUrl = new URL(`${AccountBaseURL}${EPAccountLoginToken}`);
  tokenPageUrl.searchParams.set('lang', DefaultLanguage);
  tokenPageUrl.searchParams.set('spc_clientid', verification.spcClientId);
  tokenPageUrl.searchParams.set('state', partnerState());
  tokenPageUrl.searchParams.set('tob_userid', String(merchant.staffUserId));
  tokenPageUrl.searchParams.set('next', `${PartnerBaseURL}${EPAccountTobAuth}`);
  tokenPageUrl.searchParams.set('client_id', AccountClientID);
  tokenPageUrl.searchParams.set('toc_nonce', verification.tocNonce);
  await client.followGet(tokenPageUrl.toString());

  // 2. Login TOC
  const loginTocResp = await client.request(`${AccountBaseURL}${EPLoginToc}`, {
    method: 'POST',
    headers: accountHeaders(jar, verification.deviceFingerprint),
    data: {
      toc_nonce: verification.tocNonce,
      tob_userid: merchant.staffUserId,
      security_device_fingerprint: verification.deviceFingerprint
    }
  });

  if (loginTocResp.data?.error !== 0 || !loginTocResp.data?.data?.nonce) {
    throw new Error(loginTocResp.data?.msg || `Shopee login TOC gagal (${loginTocResp.data?.error})`);
  }
  const nonce = loginTocResp.data.data.nonce;

  // 3. Exchange redirect
  const exchangeUrl = new URL(`${PartnerBaseURL}${EPAccountTobAuth}`);
  exchangeUrl.searchParams.set('code', nonce);
  exchangeUrl.searchParams.set('lang', DefaultLanguage);
  exchangeUrl.searchParams.set('spc_clientid', verification.spcClientId);
  exchangeUrl.searchParams.set('state', partnerState());
  await client.followGet(exchangeUrl.toString());

  // 4. Read LiveTokenCookie from jar
  const jwtCookie = jar.get(LiveTokenCookie, PartnerBaseURL);
  if (!jwtCookie) {
    throw new Error('Login Shopee tidak menghasilkan token sesi merchant (__shopee_partner_website_x_token_live)');
  }

  const jwtPayload = decodeJwtPayload(jwtCookie);
  if (!jwtPayload || !jwtPayload.token) {
    throw new Error('Token sesi merchant Shopee tidak terbaca');
  }

  const innerToken = jwtPayload.token;
  const exp = jwtPayload.exp ? jwtPayload.exp * 1000 : 0;

  // 5. Fetch available stores for this merchant
  const stores = await listShopeeStores(client, innerToken);
  let activeStore = null;
  if (selectedStoreId) {
    activeStore = stores.find(s => s.id === String(selectedStoreId));
  }
  if (!activeStore && stores.length > 0) {
    activeStore = stores[0];
  }

  return {
    version: 1,
    cookies: jar.snapshot(),
    accountId: String(jwtPayload.userid || ''),
    merchant,
    merchants: verification.merchants,
    stores,
    storeId: activeStore ? activeStore.id : '',
    storeName: activeStore ? activeStore.name : '',
    token: innerToken,
    createdAt: Date.now(),
    expiresAt: exp,
    switchCredential: {
      tocNonce: verification.tocNonce,
      spcClientId: verification.spcClientId,
      deviceFingerprint: verification.deviceFingerprint
    }
  };
}

/**
 * List store outlets under selected merchant
 */
async function listShopeeStores(httpClient, token) {
  const stores = [];
  const serviceLists = [StoreServices, null]; // Try filtered, fallback unfiltered

  for (const serviceList of serviceLists) {
    stores.length = 0;
    let lastStoreId = 0;

    for (let page = 0; page < 10; page++) {
      const body = {
        metadata: {
          token,
          language: DefaultLanguage,
          timezone: DefaultTimezone
        },
        storeName: '',
        lastStoreId,
        pageSize: StorePageSize
      };
      if (serviceList) {
        body.serviceList = serviceList;
      }

      const resp = await httpClient.request(`${PayBaseURL}${EPStores}`, {
        method: 'POST',
        headers: paymentHeaders(),
        data: { data: body }
      });

      const resData = resp.data || {};
      if (resData.code !== 0 && resData.error !== 0) {
        break;
      }

      const list = resData.data?.list || [];
      for (const item of list) {
        const id = String(item.storeId || '');
        if (id && !stores.some(s => s.id === id)) {
          stores.push({
            id,
            name: item.storeName || '',
            status: Number(item.status || 0)
          });
        }
      }

      const totalCount = resData.data?.storeCount ?? -1;
      if (list.length === 0 || list.length < StorePageSize || (totalCount >= 0 && stores.length >= totalCount)) {
        break;
      }
      lastStoreId = Number(list[list.length - 1]?.storeId || 0);
    }

    if (stores.length > 0) break;
  }

  return stores;
}

/**
 * Refresh Shopee merchant session silently using SwitchCredential
 */
async function refreshShopeeSession(session) {
  if (!session || !session.switchCredential || !session.cookies) {
    throw new Error('Sesi Shopee tidak memiliki kredensial untuk refresh tanpa OTP');
  }

  const jar = new ShopeeCookieJar(session.cookies);
  const client = new ShopeeHttpClient(jar);

  // Check account session alive
  const statusResp = await client.request(`${AccountBaseURL}${EPLoginStatus}`, {
    method: 'POST',
    headers: accountHeaders(jar, session.switchCredential.deviceFingerprint),
    data: {}
  });

  if (statusResp.data?.error !== 0) {
    throw new Error('Sesi akun Shopee sudah kedaluwarsa, silakan login ulang dengan OTP');
  }

  // Re-mint merchant token
  const updated = await completeShopeeLogin({
    version: 1,
    tocNonce: session.switchCredential.tocNonce,
    tocUserId: session.accountId,
    spcClientId: session.switchCredential.spcClientId,
    deviceFingerprint: session.switchCredential.deviceFingerprint,
    cookies: session.cookies,
    merchants: session.merchants || [session.merchant]
  }, session.merchant.id, session.storeId);

  return updated;
}

/**
 * List recent transactions from ShopeePay partner feed
 */
async function listShopeeTransactions(session, options = {}) {
  const jar = new ShopeeCookieJar(session.cookies);
  const client = new ShopeeHttpClient(jar);

  let currentToken = session.token;
  if (!currentToken) {
    const jwtCookie = jar.get(LiveTokenCookie, PartnerBaseURL);
    if (jwtCookie) {
      const payload = decodeJwtPayload(jwtCookie);
      currentToken = payload?.token || '';
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const startTime = options.startTime ? Math.floor(new Date(options.startTime).getTime() / 1000) : now - (24 * 3600);
  const endTime = options.endTime ? Math.floor(new Date(options.endTime).getTime() / 1000) : now;

  let activeSession = session;
  const transactions = [];

  try {
    const resp = await client.request(`${PayBaseURL}${EPTransactions}`, {
      method: 'POST',
      headers: paymentHeaders(),
      data: {
        data: {
          metadata: {
            token: currentToken,
            language: DefaultLanguage,
            timezone: DefaultTimezone
          },
          pageSize: 20,
          filter: {
            startTime,
            endTime,
            serviceList: TransactionServices
          },
          sorter: { field: 'createTime', order: 'descend' },
          next_position: ''
        }
      }
    });

    const resData = resp.data || {};
    const errCode = String(resData.code || resData.error || 0);

    // If token invalid, attempt 1 refresh
    if (InvalidTokenCodes[errCode]) {
      const refreshed = await refreshShopeeSession(session);
      activeSession = refreshed;
      return listShopeeTransactions(refreshed, options);
    }

    if (resData.code !== 0 && resData.error !== 0) {
      throw new Error(resData.msg || `ShopeePay feed error (${errCode})`);
    }

    const list = resData.data?.list || [];
    for (const raw of list) {
      const txId = String(raw.transactionId || '').trim();
      const amount = parseShopeeAmount(raw.amount);
      const createTime = Number(raw.createTime || 0);
      const merchantId = String(raw.merchantId || '');
      const storeId = String(raw.storeId || '');

      if (!txId || amount === null || !createTime) continue;
      // Filter by storeId and merchantId if available
      if (session.storeId && storeId && session.storeId !== storeId) continue;
      if (session.merchant?.id && merchantId && session.merchant.id !== merchantId) continue;

      transactions.push({
        transactionId: txId,
        orderId: String(raw.orderId || raw.referenceId || txId),
        amount,
        paymentType: 'qris_shopee',
        issuer: 'SHOPEEPAY',
        status: Number(raw.status || 0) === 3 ? 'SUCCESS' : 'PENDING',
        transactionTime: new Date(createTime * 1000).toISOString()
      });
    }
  } catch (err) {
    if (err.message && err.message.includes('401')) {
      const refreshed = await refreshShopeeSession(session);
      activeSession = refreshed;
      return listShopeeTransactions(refreshed, options);
    }
    throw err;
  }

  return { transactions, session: activeSession };
}

module.exports = {
  requestShopeeOtp,
  verifyShopeeOtp,
  completeShopeeLogin,
  listShopeeStores,
  refreshShopeeSession,
  listShopeeTransactions
};
