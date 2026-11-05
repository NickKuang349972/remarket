ALTER TABLE products
  ADD COLUMN category VARCHAR(30) NOT NULL DEFAULT '其他' AFTER description;

UPDATE products SET category = '運動' WHERE id = 1;
UPDATE products SET category = '傢俬' WHERE id = 2;
UPDATE products SET category = '電子產品' WHERE id = 3;
