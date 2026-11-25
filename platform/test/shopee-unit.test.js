const test = require('node:test');
const assert = require('node:assert/strict');
const {
  hashShopeePassword,
  parseShopeeAmount,
  parseIndonesianPhone,
  formatPhoneForVerification
} = require('../shopeeCrypto');
const { ShopeeCookieJar } = require('../shopeeCookieJar');

test('hashShopeePassword computes SHA256 of MD5 hex', () => {
  const pwd = 'secretPassword123';
  const hashed = hashShopeePassword(pwd);
  assert.equal(typeof hashed, 'string');
  assert.equal(hashed.length, 64);
  assert.match(hashed, /^[0-9a-f]{64}$/);
});

test('parseShopeeAmount correctly handles Indonesian grouped and plain formats', () => {
  assert.equal(parseShopeeAmount('30.000'), 30000);
  assert.equal(parseShopeeAmount('1.250.000'), 1250000);
  assert.equal(parseShopeeAmount('50000'), 50000);
  assert.equal(parseShopeeAmount('0'), 0);
  assert.equal(parseShopeeAmount(''), null);
  assert.equal(parseShopeeAmount('abc'), null);
  assert.equal(parseShopeeAmount('30.00'), null);
  assert.equal(parseShopeeAmount('-100'), null);
});

test('parseIndonesianPhone normalizes Indonesian numbers', () => {
  assert.equal(parseIndonesianPhone('081234567890'), '6281234567890');
  assert.equal(parseIndonesianPhone('+6281234567890'), '6281234567890');
  assert.equal(parseIndonesianPhone('6281234567890'), '6281234567890');
  assert.throws(() => parseIndonesianPhone('021123456'), /tidak valid/);
});

test('formatPhoneForVerification formats correctly for Shopee wire', () => {
  assert.equal(formatPhoneForVerification('628977110640'), '(+62) 897 7110 640');
  assert.equal(formatPhoneForVerification('6281234567890'), '(+62) 812 3456 7890');
});

test('ShopeeCookieJar manages domains, paths, and serialization', () => {
  const jar = new ShopeeCookieJar();
  jar.setCookiesFromHeaders([
    'spc_clientid=testClient123; Domain=.shopee.co.id; Path=/',
    'csrftoken=csrfVal; Domain=partner.business.accounts.shopee.co.id; Path=/'
  ], 'https://partner.business.accounts.shopee.co.id/login');

  assert.equal(jar.get('spc_clientid', 'https://partner.shopee.co.id/'), 'testClient123');
  assert.equal(jar.get('csrftoken', 'https://partner.business.accounts.shopee.co.id/'), 'csrfVal');
  assert.equal(jar.get('csrftoken', 'https://other.shopee.co.id/'), '');

  const snap = jar.snapshot();
  assert.equal(snap.length, 2);

  const newJar = new ShopeeCookieJar(snap);
  assert.equal(newJar.get('spc_clientid', 'https://partner.shopee.co.id/'), 'testClient123');
});
