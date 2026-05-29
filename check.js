const fs = require('fs');
const path = require('path');
const tg = require('./lib/telegram');

if (!tg.BOT_TOKEN || !tg.CHAT_ID) {
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
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

// 含逾期：只要 active 且距到期日 <= 提醒天數（負數代表已逾期，照樣提醒不消失）
const alerts = subs.filter(s => {
  if (s.status !== 'active') return false;
  return daysUntil(s.next_billing_date) <= (s.remind_days || 7);
});

if (!alerts.length) {
  console.log('✅ 今天沒有即將到期的訂閱');
  process.exit(0);
}

const lines = alerts.map(s => {
  const days = daysUntil(s.next_billing_date);
  const urgency = days <= 0 ? '🔴' : days <= 3 ? '🟠' : '🟡';
  const dueText = days < 0 ? `已逾期 ${-days} 天` : days === 0 ? '今天到期！' : `${days} 天後到期`;
  const cost = Math.round(myActualCost(s));
  const costLabel = s.plan_type === 'member'
    ? `我分攤 NT$${cost.toLocaleString()}`
    : `NT$${cost.toLocaleString()}`;
  return `${urgency} *${s.name}* — ${costLabel}（${dueText}）\n   📅 ${s.next_billing_date}  💳 ${s.payment || '未設定'}`;
}).join('\n\n');

const text = `📋 *訂閱到期提醒*\n\n${lines}\n\n_共 ${alerts.length} 筆，續訂後請按下方按鈕更新到下一期_`;

// 每筆一顆按鈕；callback_data 帶上目前的到期日，按鈕才知道針對哪一期（防重複按）
const reply_markup = {
  inline_keyboard: alerts.map(s => [{
    text: `✅ ${s.name} 已續訂`,
    callback_data: `renew:${s.id}:${s.next_billing_date}`,
  }]),
};

tg.sendMessage(text, { reply_markup })
  .then(() => console.log('✅ Telegram 通知已送出'))
  .catch(e => console.error('❌ 發送失敗：', e.message));
