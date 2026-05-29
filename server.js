const express = require('express');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { advanceDate } = require('./lib/renew');
const tg = require('./lib/telegram');

const app = express();
const PORT = 3456;
const HOST = '127.0.0.1';
const DATA_FILE = path.join(__dirname, 'subscriptions.json');
const BACKUP_DIR = path.join(__dirname, 'backups');
const RATES_FILE = path.join(__dirname, 'rates.cache.json');

// 安全標頭
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '50kb' }));

app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  const referer = req.headers.referer || '';
  const isLocal = origin === '' || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');
  const refIsLocal = referer === '' || referer.startsWith('http://localhost') || referer.startsWith('http://127.0.0.1');
  if (!isLocal || !refIsLocal) return res.status(403).json({ error: 'Forbidden' });
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// ── 資料讀寫 + 自動備份 ──────────────────────────────
function readData() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function writeData(data) {
  // 寫入前備份（每天最多一份）
  if (fs.existsSync(DATA_FILE)) {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);
    const today = new Date().toISOString().slice(0, 10);
    const backupFile = path.join(BACKUP_DIR, `subscriptions-${today}.json`);
    if (!fs.existsSync(backupFile)) {
      fs.copyFileSync(DATA_FILE, backupFile);
    }
    // 清除 7 天前的備份
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    fs.readdirSync(BACKUP_DIR).forEach(f => {
      const fp = path.join(BACKUP_DIR, f);
      if (fs.statSync(fp).mtimeMs < cutoff) fs.unlinkSync(fp);
    });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ── 即時匯率（快取 24 小時）────────────────────────────
const DEFAULT_RATES = { TWD: 1, USD: 32, JPY: 0.22, EUR: 35 };

function fetchRatesFromAPI() {
  // 以 USD 為基準，換算出各貨幣對 TWD 的匯率
  return new Promise((resolve, reject) => {
    const url = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json';
    https.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const r = JSON.parse(data).usd;
          const twdPerUsd = r.twd;
          const rates = {
            TWD: 1,
            USD: Math.round(twdPerUsd * 100) / 100,
            JPY: Math.round((twdPerUsd / r.jpy) * 100) / 100,
            EUR: Math.round((twdPerUsd / r.eur) * 100) / 100,
          };
          resolve(rates);
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function getRates() {
  if (fs.existsSync(RATES_FILE)) {
    const cache = JSON.parse(fs.readFileSync(RATES_FILE, 'utf-8'));
    if (Date.now() - cache.timestamp < 24 * 60 * 60 * 1000) return cache.rates;
  }
  try {
    const rates = await fetchRatesFromAPI();
    fs.writeFileSync(RATES_FILE, JSON.stringify({ timestamp: Date.now(), rates }));
    console.log('💱 匯率已更新：', rates);
    return rates;
  } catch (e) {
    console.warn('⚠️ 匯率更新失敗，使用備用值');
    if (fs.existsSync(RATES_FILE)) return JSON.parse(fs.readFileSync(RATES_FILE, 'utf-8')).rates;
    return DEFAULT_RATES;
  }
}

// ── 驗證與清理 ───────────────────────────────────────
const VALID_CATEGORIES = ['娛樂', '工具', '雲端', '健康', '新聞', '教育', '其他'];
const VALID_CYCLES = ['monthly', 'yearly', 'quarterly', 'weekly'];
const VALID_CURRENCIES = ['TWD', 'USD', 'JPY', 'EUR'];
const VALID_STATUSES = ['active', 'paused', 'cancelled'];
const VALID_PLAN_TYPES = ['solo', 'member', 'organizer'];

function validate(body) {
  const { name, amount, next_billing_date, category, cycle, currency, status, remind_days, plan_type, my_share, members } = body;
  if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 100) return '無效的服務名稱';
  if (amount === undefined || isNaN(+amount) || +amount < 0 || +amount > 9999999) return '無效的費用';
  if (!next_billing_date || !/^\d{4}-\d{2}-\d{2}$/.test(next_billing_date)) return '無效的日期格式';
  if (category && !VALID_CATEGORIES.includes(category)) return '無效的分類';
  if (cycle && !VALID_CYCLES.includes(cycle)) return '無效的週期';
  if (currency && !VALID_CURRENCIES.includes(currency)) return '無效的幣別';
  if (status && !VALID_STATUSES.includes(status)) return '無效的狀態';
  if (remind_days !== undefined && (isNaN(+remind_days) || +remind_days < 1 || +remind_days > 90)) return '無效的提醒天數';
  if (plan_type && !VALID_PLAN_TYPES.includes(plan_type)) return '無效的付款角色';
  if (my_share !== undefined && (isNaN(+my_share) || +my_share < 0)) return '無效的分攤金額';
  if (members !== undefined && !Array.isArray(members)) return '無效的成員資料';
  return null;
}

function sanitize(body) {
  const members = Array.isArray(body.members)
    ? body.members.map(m => ({
        id: String(m.id || Date.now()).slice(0, 30),
        name: String(m.name || '').trim().slice(0, 50),
        amount: parseFloat(m.amount) || 0,
        paid: Boolean(m.paid),
      })).filter(m => m.name)
    : [];
  return {
    name: String(body.name || '').trim().slice(0, 100),
    category: VALID_CATEGORIES.includes(body.category) ? body.category : '其他',
    status: VALID_STATUSES.includes(body.status) ? body.status : 'active',
    amount: parseFloat(body.amount) || 0,
    currency: VALID_CURRENCIES.includes(body.currency) ? body.currency : 'TWD',
    cycle: VALID_CYCLES.includes(body.cycle) ? body.cycle : 'monthly',
    next_billing_date: body.next_billing_date,
    payment: String(body.payment || '').trim().slice(0, 100),
    remind_days: Math.min(90, Math.max(1, parseInt(body.remind_days) || 7)),
    notes: String(body.notes || '').trim().slice(0, 500),
    plan_type: VALID_PLAN_TYPES.includes(body.plan_type) ? body.plan_type : 'solo',
    my_share: parseFloat(body.my_share) || 0,
    pay_to: String(body.pay_to || '').trim().slice(0, 50),
    members,
  };
}

// ── API 路由 ─────────────────────────────────────────
app.get('/api/rates', async (req, res) => {
  res.json(await getRates());
});

app.get('/api/subscriptions', (req, res) => {
  res.json(readData());
});

app.post('/api/subscriptions', (req, res) => {
  const err = validate(req.body);
  if (err) return res.status(400).json({ error: err });
  const data = readData();
  const item = { ...sanitize(req.body), id: Date.now().toString() };
  data.push(item);
  writeData(data);
  res.json(item);
});

app.put('/api/subscriptions/:id', (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: '無效的 ID' });
  const err = validate(req.body);
  if (err) return res.status(400).json({ error: err });
  const data = readData();
  const idx = data.findIndex(d => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  data[idx] = { ...data[idx], ...sanitize(req.body) };
  writeData(data);
  res.json(data[idx]);
});

app.delete('/api/subscriptions/:id', (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: '無效的 ID' });
  const data = readData().filter(d => d.id !== req.params.id);
  writeData(data);
  res.json({ ok: true });
});

// ── Telegram 按鈕輪詢：處理「已續訂」確認 ───────────────
let tgOffset = 0;
let tgPolling = false;

async function handleCallback(cb) {
  const m = (cb.data || '').match(/^renew:(\d+):(\d{4}-\d{2}-\d{2})$/);
  if (!m) { await tg.answerCallback(cb.id, '無法辨識的操作'); return; }
  const [, id, expectedDate] = m;

  const data = readData();
  const idx = data.findIndex(s => s.id === id);
  if (idx === -1) { await tg.answerCallback(cb.id, '找不到這筆訂閱'); return; }

  const sub = data[idx];
  // 防重複按：目前到期日已不是按鈕當初那一期，代表已更新過
  if (sub.next_billing_date !== expectedDate) {
    await tg.answerCallback(cb.id, `這筆已經更新過囉（目前 ${sub.next_billing_date}）`);
    return;
  }

  const newDate = advanceDate(sub.next_billing_date, sub.cycle);
  data[idx] = { ...sub, next_billing_date: newDate };
  writeData(data);
  await tg.answerCallback(cb.id, '已更新');
  await tg.sendMessage(`✅ *${sub.name}* 已續到 ${newDate}`);
  console.log(`🔄 ${sub.name}：${expectedDate} → ${newDate}`);
}

async function pollTelegram() {
  if (!tg.BOT_TOKEN || !tg.CHAT_ID) {
    console.warn('⚠️ 未設定 Telegram token，略過按鈕輪詢（網頁照常運作）');
    return;
  }
  tgPolling = true;
  console.log('📡 Telegram 按鈕輪詢已啟動');
  while (tgPolling) {
    try {
      const updates = await tg.getUpdates(tgOffset, 30);
      for (const u of updates) {
        tgOffset = u.update_id + 1;
        if (u.callback_query) await handleCallback(u.callback_query);
      }
    } catch (e) {
      if (tgPolling) {
        console.warn('⚠️ Telegram 輪詢錯誤：', e.message);
        await new Promise(r => setTimeout(r, 5000)); // 退避 5 秒再試
      }
    }
  }
}

const server = app.listen(PORT, HOST, () => {
  console.log(`✅ 訂閱管理工具已啟動：http://${HOST}:${PORT}`);
  console.log(`🔒 僅接受本機連線`);
  getRates();    // 啟動時預熱匯率快取
  pollTelegram(); // 開始聽 Telegram 按鈕
});

function shutdown() {
  tgPolling = false;                     // 停止輪詢迴圈
  server.close(() => process.exit(0));   // 正常情況：連線排空就退出
  server.closeAllConnections();          // 主動剪斷殘留的 keep-alive 連線（避免關機卡住）
  setTimeout(() => process.exit(0), 2000).unref();  // 保險：2 秒仍未退出就強制退出
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
