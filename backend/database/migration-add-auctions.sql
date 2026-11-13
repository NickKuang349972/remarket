-- 拍賣會：拍賣場次、出價紀錄、房間訊息
-- 用法：mysql -u root carousell_db < migration-add-auctions.sql

CREATE TABLE IF NOT EXISTS auctions (
  id INT(11) NOT NULL AUTO_INCREMENT,
  product_id INT(11) NOT NULL,
  seller VARCHAR(30) NOT NULL,
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  start_price INT(11) NOT NULL,
  min_increment INT(11) NOT NULL DEFAULT 10,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_product (product_id),
  KEY idx_time (start_at, end_at),
  CONSTRAINT fk_auction_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS bids (
  id INT(11) NOT NULL AUTO_INCREMENT,
  auction_id INT(11) NOT NULL,
  bidder VARCHAR(30) NOT NULL,
  amount INT(11) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_auction (auction_id, id),
  CONSTRAINT fk_bid_auction FOREIGN KEY (auction_id) REFERENCES auctions (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS auction_messages (
  id INT(11) NOT NULL AUTO_INCREMENT,
  auction_id INT(11) NOT NULL,
  author VARCHAR(30) NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_auction (auction_id, id),
  CONSTRAINT fk_auction_message FOREIGN KEY (auction_id) REFERENCES auctions (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
