-- Add webhook support to payments table
ALTER TABLE payments ADD COLUMN webhook_url VARCHAR(1024) NULL AFTER qris_payload;
ALTER TABLE payments ADD COLUMN webhook_status ENUM('pending','delivered','failed','skipped') NOT NULL DEFAULT 'pending' AFTER paid_at;
ALTER TABLE payments ADD COLUMN webhook_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER webhook_status;
ALTER TABLE payments ADD COLUMN webhook_last_response TEXT NULL AFTER webhook_attempts;
ALTER TABLE payments ADD COLUMN webhook_delivered_at DATETIME(3) NULL AFTER webhook_last_response;

-- Create webhook_configs table
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
