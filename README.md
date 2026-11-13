# ReMarket — 二手買賣平台

以 **Ionic 9 + Angular 22** 製作的跨平台二手買賣 App，後端使用 **PHP + MySQL**（XAMPP）。
介面為「暖調二手雜誌」風格：奶油紙底、深咖啡文字、磚紅只給選中態與主要操作，卡片採無框扁平排版。

## 组员信息
- [Chau Chi Chung] 
- [Lin Siu Wai]
- [Kuang Tsz Hei]

## 功能

| 頁面 | 功能 |
| --- | --- |
| 首頁 | 商品兩欄卡片、關鍵字即時搜尋、分類篩選、最新／價格／**距離（附近優先）**排序、下拉刷新、載入骨架、空狀態、愛心收藏 |
| 地圖 | Leaflet + OpenStreetMap 顯示**在售**商品位置；縮放聯動標記（縮小＝圓點、放大＝相片氣泡＋價格籤）、點標記跳到詳情、一鍵定位 |
| 刊登 | **多張相片上傳**（最多 8 張、封面標記、單張刪除、格式／大小預檢）、標題／價格／說明、分類、**商品狀況／交易方式／接受議價**、取得目前位置並自動填入地區 |
| 詳情 | **多圖左右滑動畫廊**、襯線標題、價格與**可議價標籤**、狀況／交易方式白膠囊與交易信息列表、分享；已售出商品自動去色並蓋章；賣家可編輯／標記售出／重新上架／刪除；買家有出價、**聯絡賣家（進入即時聊天）** |
| 聊天 | **SSE 即時聊天**：以商品為單位開啟對話、訊息即時推送、**可傳圖片**、自動捲到底、區分買家／賣家角色 |
| 拍賣 | **即時競價（SSE）**：賣家為自己的商品開拍賣（開始／結束、起標價、最低加價）、倒數中出價、出價紀錄即時更新、房間留言（賣家宣傳） |
| 我的 | 我的刊登（數量與列表）、**我的對話**、我的收藏列表、App 資訊、**登出** |

## 登入系統

- 註冊／登入頁（`/login`），密碼用 PHP `password_hash()`（bcrypt）儲存，不是明文
- 登入後取得 token 存在 `localStorage`，之後每個請求帶 `Authorization: Bearer <token>`
- 未登入不能進入：刊登、我的、聊天（路由守衛 `authGuard`）
- 聊天訊息的發送者由後端依 token 判定，前端不能假冒別人

## 專案結構

```
src/app/
  tabs/            分頁導覽（首頁／地圖／刊登／我的）
  home/            商品列表
  map/             Leaflet 地圖（縮放聯動標記）
  sell/            刊登表單（多圖上傳＋交易欄位）
  profile/         我的（刊登／收藏）
  product-detail/  商品詳情（多圖畫廊）
  chat/            即時聊天室（SSE）
  auction/         拍賣列表、拍賣房間（SSE 競價）、建立拍賣
  login/           登入／註冊
  models/          product-category.ts（分類常數）
  services/        product / user-data / location / geocoding / chat / **auction** / auth（含 authGuard）
  app.routes.ts    路由
backend/           <-- 需複製到 XAMPP 的 htdocs
  add_product.php       新增商品（multipart，支援 image[] 多圖與交易欄位）
  update_product.php    更新商品（可換多圖；未帶的欄位保留原值）
  delete_product.php    刪除商品（連同圖片檔案）
  get_products.php      讀取商品列表（聚合多圖 paths）
  send_message.php      送出聊天訊息（需登入）
  chat_stream.php       SSE 聊天串流（伺服器推送）
  auth_common.php       共用：DB 連線、JSON 回應、token 驗證
  auth_register.php     註冊
  auth_login.php        登入
  auth_me.php           用 token 取回目前使用者
  auth_logout.php       登出
  auctions.php          拍賣列表（含即時狀態）
  auction_detail.php    拍賣詳情＋出價＋房間留言
  auction_create.php    建立拍賣（限自己的商品）
  auction_bid.php       出價（後端驗證加價／時間／不可自標）
  auction_message.php   拍賣房間留言
  auction_stream.php    拍賣出價 SSE 串流
  database/
    carousell_db.sql                資料庫結構、六筆示範商品、示範對話與示範拍賣
    migration-add-trade-fields.sql  舊庫補交易欄位用
    migration-add-messages.sql      舊庫補聊天表用
    migration-add-users.sql         舊庫補使用者表用
    migration-add-seller.sql        舊庫補賣家欄位用
    migration-add-chat-image.sql    舊庫補聊天圖片欄位用
    migration-add-auctions.sql      舊庫補拍賣表用
  demo-images/          示範商品圖片（Pexels，可免費使用）
  uploads/              使用者上傳的相片
```

## 環境需求

- Node.js 20 以上、Ionic CLI（`npm i -g @ionic/cli`）
- XAMPP（Apache + MySQL + PHP 8）

## 安裝步驟

1. **後端**：把 `backend/` 整個資料夾複製到 `C:\xampp\htdocs\remarket-backend`
2. **資料庫**：二選一
   - phpMyAdmin（`http://localhost/phpmyadmin`）匯入 `backend/database/carousell_db.sql`
   - 命令列：`mysql -u root --default-character-set=utf8mb4 < carousell_db.sql`
     （`--default-character-set=utf8mb4` 必加，否則中文預設值會轉碼失敗）
3. **前端**：在專案根目錄執行 `npm install`
4. 啟動 XAMPP 的 **Apache** 和 **MySQL**
5. 執行 `npm start`，開啟 `http://localhost:4200`

## API

| 方法 | 路徑 | 說明 |
| --- | --- | --- |
| GET | `/remarket-backend/get_products.php` | 回傳 `{status, data: [...]}`；每筆商品附 `images[]` 多圖陣列與 `image`（第一張，向下相容） |
| POST | `/remarket-backend/add_product.php` | `multipart/form-data`：title, price, description, category, address, lat, lng, condition_label, delivery_method, is_negotiable, `image[]`（多張，可選） |
| POST | `/remarket-backend/update_product.php` | 同上＋`id`；沒帶的欄位保留原值 |
| POST | `/remarket-backend/delete_product.php` | `id`；刪除紀錄並清理圖片檔案 |
| POST | `/remarket-backend/send_message.php` | `product_id`, `content`；**需 `Authorization: Bearer`**，`sender` 由後端決定 |
| GET | `/remarket-backend/chat_stream.php?product_id=` | **SSE 串流**，用 `EventSource` 連線，每次推送一則訊息 |
| POST | `/remarket-backend/auth_register.php` | `username`, `password`（≥6 字） |
| POST | `/remarket-backend/auth_login.php` | `username`, `password`；回傳 `token` 與 `user` |
| GET | `/remarket-backend/auth_me.php` | 需 token，回傳目前使用者 |
| POST | `/remarket-backend/auth_logout.php` | 需 token，使 token 失效 |
| GET | `/remarket-backend/auctions.php` | 拍賣列表（含 `state`：scheduled／live／ended） |
| GET | `/remarket-backend/auction_detail.php?id=` | 拍賣詳情＋出價＋留言 |
| POST | `/remarket-backend/auction_create.php` | 需 token：`product_id, start_at, end_at, start_price, min_increment` |
| POST | `/remarket-backend/auction_bid.php` | 需 token：`auction_id, amount` |
| POST | `/remarket-backend/auction_message.php` | 需 token：`auction_id, content` |
| GET | `/remarket-backend/auction_stream.php?auction_id=` | 出價 **SSE 串流** |

## 資料庫

- `products`：基本欄位＋`status`（available/sold）、`seller`（賣家帳號）、`condition_label`（商品狀況）、`delivery_method`（交易方式）、`is_negotiable`（0/1 可議價）
- `product_images`：一對多商品圖片（`product_id` 外鍵，刪除商品時級聯清理）
- `messages`：聊天訊息（`product_id` 外鍵、`sender`、`content`、`image` 圖片路徑、`created_at`）
- `users`：帳號（`username` 唯一、`password_hash`、登入用 `token` 與到期時間）
- `auctions` / `bids` / `auction_messages`：拍賣場次、出價紀錄、房間留言（外鍵連商品／拍賣）

## 測試

```
npm run test:unit   # vitest 單元測試（服務層＋頁面冒煙）
npm run test:e2e    # Playwright 端到端
```

## 開發筆記

- **Ionic 9 沒有 `IonicModule`，也沒有 `@ionic/angular/standalone` 子路徑**，所有元件要逐一從 `@ionic/angular` 匯入，圖示用 `addIcons()` 註冊。
- HTTP 使用 `provideHttpClient()`（`src/main.ts`），`HttpClientModule` 已 deprecated。
- 後端回傳的圖片是相對路徑（`uploads/xxx.jpg`），前端用 `environment.apiBaseUrl` 組成完整網址；換位置只改這一行。
- 專案跑在 **zoneless** 模式：非同步更新畫面後要手動 `cdr.markForCheck()`。
- `is_negotiable` 資料庫存 0/1，但 PDO 會回傳 `"0"`/`"1"` 字串——判斷時要 `Number()` 轉換，直接寫 `@if` 會把 `"0"` 當真值。
- 「我的」頁以 `localStorage`（`remarket.myListings` / `remarket.favorites`）記住自己刊登與收藏的商品；聊天暱稱與對話清單分別存在 `remarket.nickname` / `remarket.chatProducts`。
- **即時聊天用 SSE**：`chat_stream.php` 每 25 秒主動結束連線讓瀏覽器重連（避免長期佔用 Apache worker），重連時瀏覽器會帶 `Last-Event-ID`，所以不會漏訊息或重複。
- **拍賣出價也走 SSE**：`auction_stream.php` 推送新出價；寫入用 `SELECT … FOR UPDATE` 鎖住場次，避免兩人同時出價造成重複。
- PHP 與 MySQL 時區要一致：`auth_common.php` 設 `Asia/Hong_Kong`，PDO 連線設 `SET time_zone = '+08:00'`，否則拍賣開始／結束時間會差 8 小時。

## 已知限制

- 有簡單登入（帳號／密碼＋token），但沒有角色權限、也沒有「忘記密碼」；token 有效期 7 天。
- 商品以 `products.seller` 記錄賣家，編輯／刪除 API 會檢查是否本人；舊資料 seller 為空時才退回 localStorage。
- 商品詳情頁的「出價」仍是模擬（Toast），真正可用的競價在「拍賣」分頁。
- SSE 每個連線會佔用一個 Apache worker，示範用（2–3 人）足夠，不適合大量併發。
- 相片上傳單張上限 5MB、最多 8 張，伺服器端不做二次壓縮。
- 地圖使用 OpenStreetMap 圖磚，需連網。
