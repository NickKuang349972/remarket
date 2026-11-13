-- 使用者帳號表（登入系統）
-- 用法：mysql -u root carousell_db < migration-add-users.sql

CREATE TABLE IF NOT EXISTS users (
  id INT(11) NOT NULL AUTO_INCREMENT,
  username VARCHAR(30) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  token VARCHAR(64) DEFAULT NULL,
  token_expires DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_username (username),
  KEY idx_token (token)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
