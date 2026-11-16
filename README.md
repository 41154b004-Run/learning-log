# 我的學習紀錄 (My Learning Records)

一個採用純 HTML、CSS、原生 JavaScript 打造的個人學習紀錄網頁。結合 **Supabase Auth** 身分驗證與 **Row Level Security (RLS)** 資料列層級安全機制，確保每位使用者只能存取與管理自己的紀錄。

---

## 檔案架構與職責說明

本專案位於最外層目錄，無需任何安裝步驟 (無須 npm / Vite / React)，雙擊 `index.html` 即可在瀏覽器中直接開啟：

| 檔案名稱 | 角色與職責說明 |
| :--- | :--- |
| **`index.html`** | 網頁主架構。包含以手機優先 (Mobile-friendly) 設計的繁體中文操作介面、訪客登入/註冊卡片、新增學習紀錄表單與歷史紀錄清單，並自 CDN 引入 Supabase JS v2。 |
| **`style.css`** | 頁面樣式表。現代卡片風格、觸控按鈕最佳化（防誤觸）、自適應手機螢幕（響應式 RWD）、安全字串自動換行樣式。 |
| **`config.js`** | Supabase 連線設定檔。僅放置專案 URL (`SUPABASE_URL`) 與公開發布金鑰 (`SUPABASE_ANON_KEY`)，嚴禁放置 secret / service_role 金鑰。 |
| **`app.js`** | 核心邏輯腳本。處理使用者註冊、登入、登出狀態監聽；處理新增紀錄、倒序排列載入清單、刪除自身紀錄；**所有使用者輸入皆透過原生 `textContent` 輸出，杜絕 XSS 跨站腳本攻擊**。 |
| **`schema.sql`** | 資料庫初始化腳本。包含建立 `learning_logs` 資料表、啟用 RLS、建立 4 項安全政策（SELECT, INSERT, UPDATE, DELETE），限制使用者僅能存取與操作自己的紀錄。 |
| **`README.md`** | 專案說明文件與 Supabase 完整操作流程指引。 |

---

## Supabase 控制台點擊步驟指引

請依照以下步驟在 Supabase 控制台設定資料庫與驗證功能：

### 第一步：在 SQL Editor 執行資料表建立腳本 (`schema.sql`)
1. 登入 [Supabase 控制台](https://supabase.com/dashboard) 並進入您的專案。
2. 點擊左側導覽列的 **SQL Editor** 圖示（圖示為 `>_` 或一疊資料庫檔案圖案）。
3. 點擊畫面右上方的 **New query** 按鈕。
4. 打開專案中的 `schema.sql`，**全選並複製內容**，貼到 SQL Editor 的編輯器中。
5. 點擊右下角綠色的 **Run** 按鈕（或按快速鍵 `Ctrl + Enter`）。
6. 下方出現 `Success. No rows returned` 即代表資料表與 RLS 政策已成功建置。

---

### 第二步：確認/取得 API 連線資訊 (`config.js`)
專案中的 `config.js` 已為您預先填入您提供的資訊：
- **Project URL**：`https://ruvvekdhofyblejupioy.supabase.co`
- **Publishable Key (anon key)**：`sb_publishable_dXhzoraLgiyBYtihsPe03w_VX-wpLuq`

若日後需要再次確認金鑰位置：
1. 點擊左側選單最下方的 **Project Settings**（齒輪圖示 ⚙️）。
2. 在左側子選單點選 **Data API**（或 **API**）。
3. 在頁面上即可看到 **Project URL** 以及 **Project API keys**（請只複製 `anon` 或 `publishable` key，**切勿使用** `service_role` key）。

---

### 第三步：設定註冊信箱驗證 (可依需求開啟或關閉)
Supabase 預設在使用者註冊時會寄出「確認驗證信」，若您希望註冊後**不用收信即可直接登入測試**：
1. 點擊左側選單的 **Authentication**（鎖頭圖示 🔐）。
2. 在子選單點選 **Providers**。
3. 展開 **Email** 設定項目。
4. 找到 **Confirm email** 開關：
   - **關閉 (OFF)**：使用者註冊後立即生效，可直接登入（最適合測試開發）。
   - **開啟 (ON)**：使用者必須至註冊信箱點擊驗證連結才能登入。
5. 捲動至最下方點擊 **Save** 儲存。

---

## 如何開啟與測試網站

1. 直接在檔案總管中，對著 `index.html` 按兩下，以 Chrome / Edge / Firefox 等現代瀏覽器開啟。
2. 在畫面上切換到「**註冊新帳號**」，輸入測試信箱與密碼（至少 6 碼）。
3. 註冊成功後登入，填寫今日學習日期、學習內容、耗時分鐘數與卡點，點擊「儲存紀錄」。
4. 觀察紀錄清單：最新紀錄會顯示在最上方；點擊「刪除」即可刪除該筆紀錄。
5. 測試 RLS 安全性：您可以註冊第二個不同的帳號並登入，會發現完全看不到前一個使用者的紀錄，證明資料庫層級的 RLS (Row Level Security) 發揮了完整的保護效果。
