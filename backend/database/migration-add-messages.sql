-- 聊天訊息表（A2 即時通訊）
-- 用法：mysql -u root carousell_db < migration-add-messages.sql
-- 或 phpMyAdmin → 選 carousell_db → Import → 選這個檔案

CREATE TABLE IF NOT EXISTS messages (
  id INT(11) NOT NULL AUTO_INCREMENT,
  product_id INT(11) NOT NULL,
  sender VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_product (product_id, id),
  CONSTRAINT fk_messages_product
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
