-- 遷移：products 加上「賣家」欄位
-- 用途：不再靠瀏覽器 localStorage 判斷「這件是不是我刊登的」

ALTER TABLE products
  ADD COLUMN seller VARCHAR(30) NOT NULL DEFAULT '' AFTER status;

-- 舊資料沒有賣家，先標成示範帳號，方便對照
UPDATE products SET seller = '陳小姐' WHERE id IN (1, 2, 5);
UPDATE products SET seller = '阿明' WHERE id IN (3, 4, 6);
