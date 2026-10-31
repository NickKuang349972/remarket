-- 遷移脚本：為舊版本的 products 表補上「地區」欄位
-- 只有當你的資料庫是由更早版本的 carousell_db.sql 建立時才需要執行一次。
-- 全新的資料庫匯入 carousell_db.sql 已包含此欄位，不需執行。

ALTER TABLE products
  ADD COLUMN address VARCHAR(150) NOT NULL DEFAULT '' AFTER description;

UPDATE products SET address = '旺角' WHERE id = 1 AND address = '';
UPDATE products SET address = '中環' WHERE id = 2 AND address = '';
UPDATE products SET address = '沙田' WHERE id = 3 AND address = '';
