ALTER TABLE products
  ADD COLUMN address VARCHAR(150) NOT NULL DEFAULT '' AFTER description;

UPDATE products SET address = '旺角' WHERE id = 1 AND address = '';
UPDATE products SET address = '中環' WHERE id = 2 AND address = '';
UPDATE products SET address = '沙田' WHERE id = 3 AND address = '';
