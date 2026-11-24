USE carousell_db;

CREATE TABLE IF NOT EXISTS conversations (
  id INT(11) NOT NULL AUTO_INCREMENT,
  product_id INT(11) NOT NULL,
  buyer VARCHAR(30) NOT NULL,
  seller VARCHAR(30) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_product_buyer (product_id, buyer),
  KEY idx_buyer (buyer),
  KEY idx_seller (seller),
  CONSTRAINT fk_conversations_product
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

ALTER TABLE messages ADD COLUMN conversation_id INT(11) NULL AFTER id;
ALTER TABLE offers ADD COLUMN conversation_id INT(11) NULL AFTER id;

INSERT INTO conversations (product_id, buyer, seller)
SELECT DISTINCT m.product_id, m.sender, p.seller
FROM messages m
INNER JOIN products p ON p.id = m.product_id
WHERE m.sender <> '系統' AND m.sender <> p.seller AND p.seller <> ''
ON DUPLICATE KEY UPDATE seller = VALUES(seller);

INSERT INTO conversations (product_id, buyer, seller)
SELECT DISTINCT o.product_id, o.buyer, p.seller
FROM offers o
INNER JOIN products p ON p.id = o.product_id
WHERE p.seller <> '' AND o.buyer <> p.seller
ON DUPLICATE KEY UPDATE seller = VALUES(seller);

UPDATE messages m
INNER JOIN conversations c ON c.product_id = m.product_id AND c.buyer = m.sender
SET m.conversation_id = c.id
WHERE m.conversation_id IS NULL;

CREATE TEMPORARY TABLE msg_conversation_backfill AS
SELECT m.id AS message_id,
       (
         SELECT c.id
         FROM conversations c
         WHERE c.product_id = m.product_id
           AND c.buyer = (
             SELECT m2.sender
             FROM messages m2
             WHERE m2.product_id = m.product_id
               AND m2.id < m.id
               AND m2.sender <> '系統'
             ORDER BY m2.id DESC
             LIMIT 1
           )
         LIMIT 1
       ) AS conversation_id
FROM messages m
WHERE m.conversation_id IS NULL;

UPDATE messages m
INNER JOIN msg_conversation_backfill b ON b.message_id = m.id
SET m.conversation_id = b.conversation_id
WHERE m.conversation_id IS NULL AND b.conversation_id IS NOT NULL;

DROP TEMPORARY TABLE msg_conversation_backfill;

UPDATE messages m
INNER JOIN (
  SELECT product_id, MIN(id) AS conversation_id
  FROM conversations
  GROUP BY product_id
) first_conv ON first_conv.product_id = m.product_id
SET m.conversation_id = first_conv.conversation_id
WHERE m.conversation_id IS NULL;

UPDATE offers o
INNER JOIN conversations c ON c.product_id = o.product_id AND c.buyer = o.buyer
SET o.conversation_id = c.id
WHERE o.conversation_id IS NULL;

ALTER TABLE messages
  ADD KEY idx_conversation (conversation_id, id),
  ADD CONSTRAINT fk_messages_conversation
    FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE;

ALTER TABLE offers
  ADD KEY idx_conversation (conversation_id, id),
  ADD CONSTRAINT fk_offers_conversation
    FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE;
