# 訂閱管理工具

個人訂閱費用管理工具，解決「不知道自己每個月到底花了多少在訂閱上」的問題。

---

## 功能

### 核心管理
- 新增 / 編輯 / 刪除訂閱，記錄名稱、金額、幣別、週期、到期日、付款方式
- 支援 TWD、USD、JPY、EUR 四種幣別，自動換算（即時匯率，每 24 小時更新）
- 狀態管理：使用中 / 暫停 / 已取消

### 家庭方案
- **個人方案**：自付全額
- **成員模式**：記錄自己的分攤金額和付給誰
- **團主模式**：管理成員名單、追蹤各成員是否已回補金額

### 費用視覺化
- 甜甜圈圖：各分類每月實際花費佔比
- 長條圖：未來 12 個月扣款預測，自動標示高峰月份
- 統計卡片：每月 / 每年實際花費（以實際負擔金額計算，非訂閱原價）

### 提醒
- Telegram Bot 推播到期提醒，每天早上 08:20（台北時間）自動執行
- 提醒訊息含 inline 按鈕：「✅ 已續訂」更新到下一個扣款週期，「❌ 不續了」直接標記為已取消，之後不再提醒

### 篩選與排序
- 排序：到期日（近 / 遠）、月費換算（高 / 低，年付自動換算為月費比較）
- Chip 篩選：分類 × 狀態，一鍵切換

### 快速新增
點擊熱門服務圖示（Netflix、Spotify、iCloud+ 等），自動帶入分類、幣別、週期，並展開對應方案供選擇；選完方案後金額同步填入。支援打字自動建議，涵蓋 20 個常見服務。

---

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | Next.js 15（Pages Router）+ 原生 HTML/CSS/JS |
| 後端 | Next.js API Routes（serverless） |
| 資料庫 | Neon PostgreSQL（serverless） |
| 圖表 | Chart.js 4.4 + chartjs-plugin-datalabels |
| 匯率 | @fawazahmed0/currency-api（免費，每日更新，快取於 DB） |
| 認證 | iron-session（加密 cookie，密碼登入） |
| 通知 | Telegram Bot API（Webhook 模式） |
| 排程 | Vercel Cron Jobs（每天 00:20 UTC = 台北 08:20） |
| 部署 | Vercel |

---

## 自行部署

### 前置需求

- [Vercel](https://vercel.com) 帳號
- [Neon](https://neon.tech) 帳號（PostgreSQL）
- Telegram Bot Token（透過 [@BotFather](https://t.me/BotFather) 建立）

### 步驟

**1. 建立 Neon 資料庫**

在 Neon 建立新 project，取得 connection string。

**2. 部署到 Vercel**

```bash
git clone <this-repo>
cd subscription-tracker
npm install
vercel --prod
```

**3. 設定環境變數**

在 Vercel 專案設定中加入：

```
DATABASE_URL=            # Neon connection string
TELEGRAM_BOT_TOKEN=      # Telegram Bot Token
TELEGRAM_CHAT_ID=        # 你的 Telegram Chat ID
APP_PASSWORD=            # 登入密碼（自訂）
SESSION_SECRET=          # 隨機 64 字元 hex 字串
TELEGRAM_WEBHOOK_SECRET= # 隨機字串，Webhook 驗證用
CRON_SECRET=             # 選填（Vercel Pro 方案才需要）：驗證 /api/cron/check 是 Vercel Cron 觸發，
                         # 沒設也沒關係，端點會退而求其次驗 Vercel cron 專屬 header
```

要手動測試提醒功能（不等排程），瀏覽器打開：

```
https://<your-vercel-url>/api/cron/check?secret=<APP_PASSWORD>
```

**4. 初始化資料庫**

```bash
node --env-file=.env.local scripts/migrate.mjs
```

**5. 註冊 Telegram Webhook**

部署完成後，瀏覽器打開：

```
https://<your-vercel-url>/api/telegram/setup?secret=<APP_PASSWORD>
```

---

## 本機開發

複製 `.env.local.example` 為 `.env.local`，填入環境變數後：

```bash
npm run dev
```

打開瀏覽器前往 `http://localhost:3000`
