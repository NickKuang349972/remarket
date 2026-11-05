ALTER TABLE products
  ADD COLUMN condition_label VARCHAR(20) NOT NULL DEFAULT '轻微使用痕迹' AFTER status,
  ADD COLUMN delivery_method VARCHAR(30) NOT NULL DEFAULT '面交' AFTER condition_label,
  ADD COLUMN is_negotiable TINYINT(1) NOT NULL DEFAULT 0 AFTER delivery_method;

UPDATE products SET condition_label = '明显使用痕迹', delivery_method = '面交', is_negotiable = 1 WHERE id = 1;
UPDATE products SET condition_label = '轻微使用痕迹', delivery_method = '面交', is_negotiable = 0 WHERE id = 2;
UPDATE products SET condition_label = '99新', delivery_method = '顺丰快递', is_negotiable = 0 WHERE id = 3;
