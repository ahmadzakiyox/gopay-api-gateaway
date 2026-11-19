const assert = require('node:assert/strict');
const test = require('node:test');
const axios = require('axios');
const { requestOtp, verifyOtp } = require('../gopayAdapter');

test('passes OTP text unchanged to GoPay and honors provider rejection', async (t) => {
  let forwarded;
  const sample = '  synthetic-code  ';
  t.mock.method(axios, 'post', async (_url, body) => {
    if (!body.grant_type) return { data: { data: { otp_token: 'fixture' } } };
    forwarded = body.data.otp;
    throw Object.assign(new Error('Provider rejected fixture'), { response: { status: 400 } });
  });
  const profile = t.mock.method(axios, 'get', async () => {
    throw new Error('Profile must not be requested after rejection');
  });
  await requestOtp(42, '081234567890');
  await assert.rejects(verifyOtp(42, sample), /Provider rejected fixture/);
  assert.equal(forwarded, sample);
  assert.equal(profile.mock.callCount(), 0);
});
