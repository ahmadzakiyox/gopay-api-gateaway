-- Migration: 003_add_service_type_to_api_keys.sql
-- Description: Add service_type column to api_keys table

SET @col_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'api_keys'
    AND COLUMN_NAME = 'service_type'
);

SET @sql = IF(@col_exists = 0,
  "ALTER TABLE api_keys ADD COLUMN service_type ENUM('website', 'bot') NOT NULL DEFAULT 'website' AFTER user_id",
  "SELECT 'Column service_type already exists in api_keys' AS msg"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
