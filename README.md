# ReMarket — 二手買賣平台

以 **Ionic 9 + Angular 22** 製作的跨平台二手買賣 App，後端使用 **PHP + MySQL**（XAMPP）。
介面為「暖調二手雜誌」風格：奶油紙底、深咖啡文字、磚紅只給選中態與主要操作，卡片採無框扁平排版。

## 功能

| 頁面 | 功能 |
| --- | --- |
| 首頁 | 商品兩欄卡片、關鍵字即時搜尋、分類篩選、最新／價格／**距離（附近優先）**排序、下拉刷新、載入骨架、空狀態、愛心收藏 |
| 地圖 | Leaflet + OpenStreetMap 顯示**在售**商品位置；縮放聯動標記（縮小＝圓點、放大＝相片氣泡＋價格籤）、點標記跳到詳情、一鍵定位 |
| 刊登 | **多張相片上傳**（最多 8 張、封面標記、單張刪除、格式／大小預檢）、標題／價格／說明、分類、**商品狀況／交易方式／接受議價**、取得目前位置並自動填入地區 |
| 詳情 | **多圖左右滑動畫廊**、襯線標題、價格與**可議價標籤**、狀況／交易方式白膠囊與交易信息列表、分享；已售出商品自動去色並蓋章；賣家可編輯／標記售出／重新上架／刪除；買家有出價、聯絡賣家操作欄 |
| 我的 | 我的刊登（數量與列表）、我的收藏列表、App 資訊 |

## 專案結構

```
src/app/
  tabs/            分頁導覽（首頁／地圖／刊登／我的）
  home/            商品列表
  map/             Leaflet 地圖（縮放聯動標記）
  sell/            刊登表單（多圖上傳＋交易欄位）
  profile/         我的（刊登／收藏）
  product-detail/  商品詳情（多圖畫廊）
  models/          product-category.ts（分類常數）
  services/        product / user-data / location / geocoding
  app.routes.ts    路由
backend/           <-- 需複製到 XAMPP 的 htdocs
  add_product.php       新增商品（multipart，支援 image[] 多圖與交易欄位）
  update_product.php    更新商品（可換多圖；未帶的欄位保留原值）
  delete_product.php    刪除商品（連同圖片檔案）
  get_products.php      讀取商品列表（聚合多圖 paths）
  database/
    carousell_db.sql                資料庫結構與六筆示範商品（含圖片）
    migration-add-trade-fields.sql  舊庫補交易欄位用
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

## 資料庫

- `products`：基本欄位＋`status`（available/sold）、`condition_label`（商品狀況）、`delivery_method`（交易方式）、`is_negotiable`（0/1 可議價）
- `product_images`：一對多商品圖片（`product_id` 外鍵，刪除商品時級聯清理）

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
- 「我的」頁以 `localStorage`（`remarket.myListings` / `remarket.favorites`）記住自己刊登與收藏的商品。
- `ion-img` 的 `object-fit` 要寫在其內部影像生效的層級，且在 `ion-item` 的 flex 列中要加 `flex: 0 0 auto`，避免被長標題擠壓變形。

## 已知限制

- 未有會員系統：「我的」頁以瀏覽器 localStorage 模擬個人刊登，換裝置不同步。
- 出價與聯絡賣家為模擬流程（Toast／mailto），未有站內聊天與交易系統。
- 相片上傳單張上限 5MB、最多 8 張，伺服器端不做二次壓縮。
- 地圖使用 OpenStreetMap 圖磚，需連網。
