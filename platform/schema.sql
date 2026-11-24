CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  telegram_id VARCHAR(64) NOT NULL UNIQUE,
  username VARCHAR(255) NULL,
  first_name VARCHAR(255) NULL,
  photo_url VARCHAR(512) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS web_sessions (
  id CHAR(64) NOT NULL PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (expires_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS gopay_accounts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  phone_number VARCHAR(32) NULL,
  merchant_id VARCHAR(255) NULL,
  merchant_name VARCHAR(255) NULL,
  owner_name VARCHAR(255) NULL,
  encrypted_session TEXT NULL,
  status ENUM('disconnected','otp_pending','connected','error') NOT NULL DEFAULT 'disconnected',
  last_error VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_gopay_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS qris_configs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  static_qris TEXT NOT NULL,
  merchant_name VARCHAR(255) NULL,
  is_valid TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_qris_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS api_keys (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  encrypted_key TEXT NOT NULL,
  key_prefix VARCHAR(16) NOT NULL,
  key_hash CHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  rotated_at TIMESTAMP NULL,
  UNIQUE KEY uq_api_keys_key_hash (key_hash),
  CONSTRAINT fk_api_key_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(100) NOT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (user_id, created_at),
  CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  order_id VARCHAR(128) NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL,
  base_amount BIGINT UNSIGNED NOT NULL,
  surcharge SMALLINT UNSIGNED NOT NULL,
  payable_amount BIGINT UNSIGNED NOT NULL,
  qris_payload TEXT NOT NULL,
  status ENUM('pending','paid','expired','cancelled') NOT NULL DEFAULT 'pending',
  provider_transaction_id VARCHAR(128) NULL,
  provider_order_id VARCHAR(128) NULL,
  provider_payment_type VARCHAR(64) NULL,
  provider_issuer VARCHAR(128) NULL,
  provider_transaction_time DATETIME(3) NULL,
  paid_at DATETIME(3) NULL,
  expires_at DATETIME(3) NOT NULL,
  reservation_until DATETIME(3) NOT NULL,
  webhook_url VARCHAR(1024) NULL,
  webhook_status ENUM('pending','delivered','failed','skipped') NOT NULL DEFAULT 'pending',
  webhook_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  webhook_last_response TEXT NULL,
  webhook_delivered_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_payments_user_idempotency (user_id, idempotency_key),
  UNIQUE KEY uq_payments_user_order (user_id, order_id),
  UNIQUE KEY uq_payments_provider_transaction (provider_transaction_id),
  KEY idx_payments_poll (user_id, status, created_at),
  KEY idx_payments_reservation (user_id, reservation_until, payable_amount),
  KEY idx_payments_amount_reservation (payable_amount, status, reservation_until),
  CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS webhook_configs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  webhook_url VARCHAR(1024) NOT NULL,
  secret VARCHAR(128) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_webhook_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
