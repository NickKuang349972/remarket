# ReMarket 待辦與分工

> 更新日期：2026-10-31
> 截止：2026-11-06（五）13:59，檔名 `GroupN_A1.zip`

## 已完成（不用再做）

- Ionic 9 + Angular 22 專案骨架、分頁導覽（首頁／地圖／刊登／我的）
- 首頁：兩欄卡片、關鍵字搜尋、分類 chips 篩選、價格排序（最新／價格升／價格降）、下拉刷新、骨架、空狀態
- 收藏：卡片與詳情頁的愛心，資料存在瀏覽器 localStorage
- 商品詳情：大圖、價格、說明、位置、分享（複製連結或系統分享）
- 刊登：相片上傳與預覽、表單驗證、定位
- 地圖：Leaflet + OpenStreetMap、商品標記、點擊跳詳情
- 我的：我的刊登、我的收藏、統計
- 後端：`get_products.php`、`add_product.php`（multipart 圖片上傳）、`update_product.php`、`delete_product.php`
- 商品管理：賣家可編輯／刪除自己刊登的商品
- 分類：`products.category`、刊登／編輯可選分類、詳情頁顯示、`get_products.php?category=` 支援篩選
- 差異化功能：**附近優先**（按距離排序、卡片顯示距離）、地圖可定位到自己的位置
- 資料庫：`backend/database/carousell_db.sql`（建表 + 三筆示範資料）

## 待辦（請認領）

| # | 任務 | 類型 | 估時 | 起手提示 |
| --- | --- | --- | --- | --- |
| 1 | 已售出狀態 | 前後端 | 2.5h | `products` 加 `status ENUM('available','sold')`；卡片加「已售出」標籤，詳情頁可切換 |
| 2 | 多張圖片上傳 | 前後端 | 3h | 新增 `product_images` 表（product_id, path）；`add_product.php` 接受 `image[]` |
| 3 | 測試與程式碼整理 | 前端 | 3h | `npm run lint`、修正預設 spec、補 `product.service` 的單元測試 |
| 4 | App 圖示與 PWA | 前端 | 1.5h | `assets/icon`、`manifest.webmanifest`、`index.html` meta |
| 5 | README 截圖與組員名單 | 文件 | 1h | 每個頁面截一張，寫上組員姓名學號 |

## 開發注意事項

1. **改資料庫一定要同步改 `backend/database/carousell_db.sql`**，否則組員匯入後會缺欄位、整個跑不起來。
2. 每次開工前先 `git pull`，push 前再 `git pull` 一次，避免衝突。
3. commit message 用「動詞 + 做了什麼」，例如：
   - `feat: 新增商品編輯功能`
   - `fix: 修正價格排序錯誤`
   - `docs: 補上安裝截圖`
4. 後端 API 回傳格式統一為 `{ status: 'success' | 'error', data?, message?, id? }`，前端由 `src/app/services/product.service.ts` 統一呼叫 —— **不要在頁面裡直接寫 `http.get` 或 fetch**。
5. 本機測試：開 XAMPP（Apache + MySQL）→ 後端資料夾放在 `C:\xampp\htdocs\remarket-backend` → `ionic serve`。

## 交件檢查清單

- [ ] 三個分頁都能正常操作，沒有紅色 console 錯誤
- [ ] `npm run lint` 沒有錯誤
- [ ] README 有截圖與組員名單
- [ ] 資料庫匯入 `carousell_db.sql` 後可正常顯示示範商品
- [ ] 壓縮檔命名 `GroupN_A1.zip`，**不含** `node_modules`、`www`、`.angular`
- [ ] 11 月 6 日 13:59 前上傳 Blackboard

> 打包指令（在專案根目錄執行）：`git archive --format=zip -o Group1_A1.zip HEAD`
