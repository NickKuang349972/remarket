-- 遷移：聊天訊息支援圖片
ALTER TABLE messages
  ADD COLUMN image VARCHAR(255) NOT NULL DEFAULT '' AFTER content;
