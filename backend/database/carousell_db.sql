CREATE DATABASE IF NOT EXISTS carousell_db
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

USE carousell_db;

DROP TABLE IF EXISTS auction_messages;
DROP TABLE IF EXISTS bids;
DROP TABLE IF EXISTS auctions;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS product_images;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;

CREATE TABLE products (
  id INT(11) NOT NULL AUTO_INCREMENT,
  title VARCHAR(100) NOT NULL,
  price INT(11) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(30) NOT NULL DEFAULT '其他',
  address VARCHAR(150) NOT NULL DEFAULT '',
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'available',
  seller VARCHAR(30) NOT NULL DEFAULT '',
  condition_label VARCHAR(20) NOT NULL DEFAULT '轻微使用痕迹',
  delivery_method VARCHAR(30) NOT NULL DEFAULT '面交',
  is_negotiable TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE product_images (
  id INT(11) NOT NULL AUTO_INCREMENT,
  product_id INT(11) NOT NULL,
  path VARCHAR(255) NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

INSERT INTO products (id, title, price, description, category, address, lat, lng, status, seller, condition_label, delivery_method, is_negotiable) VALUES
(1, 'iPad Air 4 64GB WiFi 連 Pencil', 2680, '自用一年，一直貼膜帶套，機面零花。連 Apple Pencil 一齊讓，有盒有單（第二張圖），原裝充電線齊。銅鑼灣地鐵站交收，可小刀。', '電子產品', '銅鑼灣', 22.28000000, 114.18510000, 'available', '陳小姐', '99新', '面交', 1),
(2, '實木書架 五層 原木色', 1200, '五層實木書架，好穩陣唔搖晃。有少少使用痕跡（睇圖），無爛無蛀。第二張係擺咗書嘅效果。荃灣近港鐵自取，需自行搬運，可議價。', '傢俬', '荃灣', 22.37080000, 114.12080000, 'available', '陳小姐', '轻微使用痕迹', '面交', 1),
(3, '瑜伽墊 5mm 連啞鈴一對', 260, '搬屋急讓！瑜伽墊連 1kg / 2kg 啞鈴一對，一套攞齊 HK$260。有使用痕跡（第二張圖係使用場景），衛生抵用。順豐到付或沙田交收。', '運動', '沙田', 22.37700000, 114.19740000, 'sold', '阿明', '明显使用痕迹', '顺丰快递', 0),
(4, 'Nike AF1 07 全白 US8.5', 250, 'Nike Air Force 1 07 全白，US8.5 / UK7.5，著過兩三次，好新淨。旺角面交或順豐到付。', '服飾', '旺角', 22.31850000, 114.16900000, 'available', '阿明', '99新', '顺丰快递', 0),
(5, '金庸作品集 平裝全套', 80, '金庸作品集平裝全套，書齡耐，書頁有黃斑同少量筆記，介意勿擾。觀塘自取或順豐到付。', '書籍', '觀塘', 22.30900000, 114.22550000, 'sold', '陳小姐', '明显使用痕迹', '顺丰快递', 0),
(6, 'LEGO Ideas Polaroid 相機 21345', 450, '砌過一次，全部件齊、有說明書，無盒。白淨無黃，擺出嚟好靚。將軍澳面交。', '其他', '將軍澳', 22.31700000, 114.26400000, 'sold', '阿明', '99新', '面交', 0);

INSERT INTO product_images (product_id, path) VALUES
(1, 'demo-images/ipad.jpg'),
(1, 'demo-images/ipad-2.jpg'),
(2, 'demo-images/bookshelf.jpg'),
(2, 'demo-images/bookshelf-2.jpg'),
(3, 'demo-images/yoga.jpg'),
(3, 'demo-images/yoga-2.jpg'),
(4, 'demo-images/sneakers.jpg'),
(5, 'demo-images/books.jpg'),
(6, 'demo-images/lego.jpg');

-- 即時聊天（A2）：SSE 串流用的訊息表
CREATE TABLE messages (
  id INT(11) NOT NULL AUTO_INCREMENT,
  product_id INT(11) NOT NULL,
  sender VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  image VARCHAR(255) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_product (product_id, id),
  CONSTRAINT fk_messages_product
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

-- 示範對話（買家「阿明」向賣家查詢 iPad）
INSERT INTO messages (product_id, sender, content) VALUES
(1, '阿明', '你好，想問下部 iPad 仲有冇貨？'),
(1, '陳小姐', '有貨呀，連 Apple Pencil 一齊，你幾時得閒交收？'),
(1, '阿明', '聽日下晝銅鑼灣站可以嗎？');

-- 使用者帳號（登入系統；密碼用 PHP password_hash 加密）
CREATE TABLE users (
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

-- 拍賣會（A2 即時競價）
CREATE TABLE auctions (
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

CREATE TABLE bids (
  id INT(11) NOT NULL AUTO_INCREMENT,
  auction_id INT(11) NOT NULL,
  bidder VARCHAR(30) NOT NULL,
  amount INT(11) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_auction (auction_id, id),
  CONSTRAINT fk_bid_auction FOREIGN KEY (auction_id) REFERENCES auctions (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE auction_messages (
  id INT(11) NOT NULL AUTO_INCREMENT,
  auction_id INT(11) NOT NULL,
  author VARCHAR(30) NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_auction (auction_id, id),
  CONSTRAINT fk_auction_message FOREIGN KEY (auction_id) REFERENCES auctions (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

-- 示範拍賣：匯入時即刻「進行中」，方便直接示範即時競價
INSERT INTO auctions (product_id, seller, start_at, end_at, start_price, min_increment) VALUES
(1, '陳小姐', DATE_SUB(NOW(), INTERVAL 10 MINUTE), DATE_ADD(NOW(), INTERVAL 3 HOUR), 2000, 50);

INSERT INTO auction_messages (auction_id, author, content) VALUES
(1, '陳小姐', '今晚八點前截標，iPad 連 Apple Pencil，有盒有單，歡迎提問！');
