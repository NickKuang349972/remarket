# ReMarket — 二手買賣平台

以 **Ionic 9 + Angular 22** 製作的跨平台二手買賣 App，後端使用 **PHP + MySQL**（XAMPP）。
介面參考 Carousell 的兩欄卡片排版，主色為綠色。

## 功能

| 頁面 | 功能 |
| --- | --- |
| 首頁 | 商品兩欄卡片、關鍵字即時搜尋、分類篩選、價格排序、**按距離排序（附近優先）**、下拉刷新、載入骨架、空狀態 |
| 地圖 | Leaflet + OpenStreetMap 顯示所有商品位置，點標記跳到詳情，可定位到自己的位置 |
| 刊登 | 相片上傳與預覽、標題／價格／說明驗證、分類、取得目前位置並自動填入地區 |
| 詳情 | 大圖、價格、分類、說明、地區、分享，自己的商品可編輯／刪除 |
| 我的 | 目前在售商品數量、App 資訊 |

## 專案結構

```
src/app/
  tabs/            分頁導覽（首頁／地圖／刊登／我的）
  home/            商品列表
  map/             Leaflet 地圖
  sell/            刊登表單
  profile/         我的
  product-detail/  商品詳情
  services/        product.service.ts（所有 API 呼叫集中在這裡）
  app.routes.ts    路由
backend/           <-- 需複製到 XAMPP 的 htdocs
  add_product.php      新增商品（multipart，含相片上傳）
  get_products.php     讀取商品列表
  database/carousell_db.sql  資料庫結構與示範資料
  uploads/             上傳的相片
```

## 環境需求

- Node.js 20 以上、Ionic CLI（`npm i -g @ionic/cli`）
- XAMPP（Apache + MySQL + PHP 8）

## 安裝步驟

1. **後端**：把 `backend/` 整個資料夾複製到 `C:\xampp\htdocs\remarket-backend`
2. **資料庫**：開啟 `http://localhost/phpmyadmin`，匯入 `backend/database/carousell_db.sql`
3. **前端**：在專案根目錄執行 `npm install`
4. 啟動 XAMPP 的 **Apache** 和 **MySQL**
5. 執行 `ionic serve`，開啟 `http://localhost:8100`

## API

| 方法 | 路徑 | 說明 |
| --- | --- | --- |
| GET | `/remarket-backend/get_products.php` | 回傳 `{status, data: [...]}` |
| POST | `/remarket-backend/add_product.php` | `multipart/form-data`：title, price, description, lat, lng, image（可選） |

## 開發筆記

- **Ionic 9 沒有 `IonicModule`，也沒有 `@ionic/angular/standalone` 子路徑**，所有元件要逐一從 `@ionic/angular` 匯入。
- HTTP 使用 `provideHttpClient()`（`src/main.ts`），`HttpClientModule` 已 deprecated。
- 後端回傳的圖片是相對路徑（`uploads/xxx.jpg`），前端用 `environment.apiBaseUrl` 組成完整網址。
- 後端網址集中在 `src/environments/environment.ts`，換位置只改這一行。

## 已知限制

- 未有會員系統，所以「我的」頁顯示的是全部商品數，不是個人刊登。
- 未支援編輯、刪除商品。
- 地圖使用 OpenStreetMap 圖磚，需連網。
