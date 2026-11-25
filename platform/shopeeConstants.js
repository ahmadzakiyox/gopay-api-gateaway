// Constants and endpoints for Shopee Merchant / ShopeePay Partner reverse-engineered flow.

module.exports = {
  AccountBaseURL: 'https://partner.business.accounts.shopee.co.id',
  PartnerBaseURL: 'https://partner.shopee.co.id',
  PartnerAPIBaseURL: 'https://api.partner.shopee.co.id',
  PayBaseURL: 'https://shopeepay.shopee.co.id',
  DeviceFingerprintURL: 'https://df.infra.sz.shopee.co.id/v2/shpsec/web/report',
  SZSDKVersion: '1.12.26-user.1',

  // Endpoints
  EPCheckPasswordMigration: '/api/v4/account/business/check_password_migrate',
  EPCheckAccountByPassword: '/api/v4/account/business/check_account_exist_by_password',
  EPAuthenticateByPassword: '/api/v4/account/business/authenticate_toc_by_password',
  EPOtpSettings: '/api/v4/account/business/get_otp_settings',
  EPSendOtp: '/api/v4/account/business/send_otp',
  EPVerifyOtp: '/api/v4/account/business/verify_otp',
  EPAuthenticateByOtp: '/api/v4/account/business/authenticate_toc_by_otp',
  EPLoginToc: '/api/v4/account/business/login_toc',
  EPLoginStatus: '/api/v4/account/business/login_status',
  EPMerchantDetect: '/nb/mss/mer-detect-api/PartnerMerchantDetectServer/MerchantDetect',
  EPSwitchMerchant: '/nb/mss/mer-detect-api/PartnerMerchantDetectServer/SwitchMerchant',
  EPUserInfo: '/nb/mss/web-api/PartnerAccountServer/GetUserInfo',
  EPAccountLogin: '/account/login/auth',
  EPAccountLoginToken: '/authenticate/login/token/',
  EPAccountTobAuth: '/account/login/tob/auth',
  EPPartnerLoginAuth: '/login/auth',
  EPStores: '/merchant/v1/partner-web/get-store-list',
  EPTransactions: '/merchant/v1/partner-web/get-transaction-list',

  // Operation & Config
  OTPOperation: 50001,
  DefaultOTPChannel: 3, // 3 = WhatsApp, 1 = SMS
  DefaultLanguage: 'id',
  DefaultTimezone: 'Asia/Jakarta',

  PartnerLoginFrom: '12',
  BusinessClientID: '1',
  AccountClientID: '5',

  // Cookies
  LiveTokenCookie: '__shopee_partner_website_x_token_live',
  ClientIDCookie: 'spc_clientid',

  // Feed & stores
  CompletedTransactionStatus: 3,
  TransactionPageSize: 10,
  StorePageSize: 30,
  TransactionServices: [1, 3],
  StoreServices: [1, 10],

  // Known invalid token codes signaling session expiry
  InvalidTokenCodes: {
    '200020': true,
    '200021': true,
    '200022': true,
    '200023': true
  },

  AuthErrorNeedOTP: 48401102,
  AuthErrorNotLogin: 48500102,

  // Reference device risk report blob
  DeviceRiskBlob: `HxcBAAAABAAAAIAAACDdczPIywBM54CDLG9ibtvg9johSySkG53c8Zv4KqOrk7SmgEk9gmRVSv/GrMhmbYwxm4pFqx5F8HZNsqsZgIqb8QoIJgpnQmD6R/Odp/zXTYq6UrsG0C7fX6FtEqXceQlT/R8X7vPF1UcJq5c7JePSGFZHi0cZ4YkKllrKzEZJVsl9YKtlGJ+ZqgAAAIUAAAAAAH/K8trNpVeopTB86riRVQ1oHKzKkAJugJB4DgO0ZBLB4zZzwqnqUeLB/M2fxz95sCCNxtqErozjhUWCFBg0uuM1MjiJeChKkdEy1Oro5FS42gMMqtSJjzeyetst1qRYS9+/35HMi395BWuWLBUnpCmSt0RypalRaNpTs48JjvpBAAAf0CiG4xZSm2qOL3O8vok9hJIVLTxaMqp0bmpGdqkIxQ8EJnPlXgqKjXYyzhEVq+s1XGTUZgKentFW5qxSsNd7UuXr`
};
