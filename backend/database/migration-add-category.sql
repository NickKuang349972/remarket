-- 遷移脚本：為舊版本的 products 表補上「分類」欄位
-- 只有當你的資料庫是由更早版本的 carousell_db.sql 建立時才需要執行一次。
-- 全新的資料庫匯入 carousell_db.sql 已包含此欄位，不需執行。

ALTER TABLE products
  ADD COLUMN category VARCHAR(30) NOT NULL DEFAULT '其他' AFTER description;

UPDATE products SET category = '運動' WHERE id = 1;
UPDATE products SET category = '傢俬' WHERE id = 2;
UPDATE products SET category = '電子產品' WHERE id = 3;
