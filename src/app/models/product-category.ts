/** 商品分類（前後端共用的固定清單） */
export const PRODUCT_CATEGORIES = [
  '電子產品',
  '傢俬',
  '服飾',
  '運動',
  '書籍',
  '其他',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
