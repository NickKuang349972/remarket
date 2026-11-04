-- ReMarket 資料庫結構與測試資料
-- 用法（二選一）：
--   1. phpMyAdmin → 匯入 → 選這個檔案 → 執行
--   2. 命令列：mysql -u root < carousell_db.sql
-- 注意：會先刪除舊的 products 表，重新建立並寫入三筆示範商品。
--
-- 已經有舊資料庫、不想重建資料的話，只執行下面這句即可：
--   ALTER TABLE products
--     ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'available' AFTER lng;

CREATE DATABASE IF NOT EXISTS carousell_db
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

USE carousell_db;

DROP TABLE IF EXISTS products;

CREATE TABLE products (
  id INT(11) NOT NULL AUTO_INCREMENT,
  title VARCHAR(100) NOT NULL,
  price INT(11) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(30) NOT NULL DEFAULT '其他',
  address VARCHAR(150) NOT NULL DEFAULT '',
  image VARCHAR(255) NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  -- 商品狀態：available（在售）/ sold（已售出）
  status VARCHAR(20) NOT NULL DEFAULT 'available',
  PRIMARY KEY (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

INSERT INTO products (title, price, description, category, address, image, lat, lng, status) VALUES
('復古單車 26吋 7成新', 850, '買咗兩年，少踩，鏈條新換，附車鎖。旺角自取。', '運動', '旺角', 'demo-images/bike.svg', 22.31930000, 114.16940000, 'available'),
('IKEA 書枱 白色', 300, '120x60cm，有少許使用痕跡，需自行搬運。', '傢俬', '中環', 'demo-images/desk.svg', 22.28190000, 114.15820000, 'available'),
('Sony 頭戴式耳機 WH-1000XM4', 1200, '95新，有盒有單，功能完全正常。', '電子產品', '沙田', 'demo-images/headphones.svg', 22.37710000, 114.19740000, 'sold');
