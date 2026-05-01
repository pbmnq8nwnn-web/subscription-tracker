const fs = require('fs');
const path = require('path');
const https = require('https');

// 讀取 .env
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf-8').split('\n').forEach(line => {
    const [k, v] = line.split('=');
    if (k && v) process.env[k.trim()] = v.trim();
  });
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID   || '';

if (!BOT_TOKEN || !CHAT_ID) {
  console.error('❌ 請確認 .env 內有 TELEGRAM_BOT_TOKEN 和 TELEGRAM_CHAT_ID');
  process.exit(1);
}

const EXCHANGE = { TWD: 1, USD: 32, JPY: 0.22, EUR: 35 };

function toTWD(amount, currency) {
  return (+amount) * (EXCHANGE[currency] || 1);
}

function myActualCost(s) {
  if (s.plan_type === 'member') return toTWD(s.my_share || 0, s.currency);
  if (s.plan_type === 'organizer') {
    const membersTotal = (s.members || []).reduce((sum, m) => sum + toTWD(m.amount || 0, s.currency), 0);
    return Math.max(0, toTWD(s.amount, s.currency) - membersTotal);
  }
  return toTWD(s.amount, s.currency);
}

const DATA_FILE = path.join(__dirname, 'subscriptions.json');
const subs = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

function daysUntil(dateStr) {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(dateStr); d.setHours(0,0,0,0);
  return Math.round((d - today) / 86400000);
}

const alerts = subs.filter(s => {
  if (s.status !== 'active') return false;
  const days = daysUntil(s.next_billing_date);
  return days >= 0 && days <= (s.remind_days || 7);
});

if (!alerts.length) {
  console.log('✅ 今天沒有即將到期的訂閱');
  process.exit(0);
}

const lines = alerts.map(s => {
  const days = daysUntil(s.next_billing_date);
  const urgency = days === 0 ? '🔴' : days <= 3 ? '🟠' : '🟡';
  const dueText = days === 0 ? '今天到期！' : `${days} 天後到期`;
  const cost = Math.round(myActualCost(s));
  const costLabel = s.plan_type === 'member'
    ? `我分攤 NT$${cost.toLocaleString()}`
    : `NT$${cost.toLocaleString()}`;
  return `${urgency} *${s.name}* — ${costLabel}（${dueText}）\n   📅 ${s.next_billing_date}  💳 ${s.payment || '未設定'}`;
}).join('\n\n');

const text = `📋 *訂閱到期提醒*\n\n${lines}\n\n_共 ${alerts.length} 筆即將到期_`;

function sendTelegram(msg) {
  const body = JSON.stringify({ chat_id: CHAT_ID, text: msg, parse_mode: 'Markdown' });
  const opts = {
    hostname: 'api.telegram.org',
    path: `/bot${BOT_TOKEN}/sendMessage`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  };
  const req = https.request(opts, res => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      const json = JSON.parse(data);
      if (json.ok) console.log('✅ Telegram 通知已送出');
      else console.error('❌ Telegram 錯誤：', json.description);
    });
  });
  req.on('error', e => console.error('❌ 網路錯誤：', e.message));
  req.write(body);
  req.end();
}

sendTelegram(text);
