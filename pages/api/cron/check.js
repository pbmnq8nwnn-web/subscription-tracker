import sql, { normalizeRow } from '../../../lib/db';
import { sendMessage } from '../../../lib/telegram';
import { getRates, formatCost } from '../../../lib/rates';

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  // Auth 策略：
  // 1. Vercel Cron 帶 CRON_SECRET → 驗 header（正常情況）
  // 2. CRON_SECRET 未注入（Hobby team 限制）→ 退而求其次驗 Vercel cron 專屬特徵
  //    （x-vercel-cron header 或 user-agent 開頭 vercel-cron/），不是完全放行
  // 3. 手動測試 → ?secret=APP_PASSWORD（APP_PASSWORD 沒設就一律拒絕，避免 undefined === undefined 恆過）
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  const looksLikeVercelCron =
    req.headers['x-vercel-cron'] !== undefined ||
    (req.headers['user-agent'] || '').startsWith('vercel-cron/');
  const isVercelCron = cronSecret ? authHeader === `Bearer ${cronSecret}` : looksLikeVercelCron;
  const appPassword = process.env.APP_PASSWORD;
  const isManual = Boolean(appPassword) && req.query.secret === appPassword;
  if (!isVercelCron && !isManual) {
    return res.status(401).end();
  }

  const rows = await sql`SELECT * FROM subscriptions WHERE status = 'active'`;
  const subs = rows.map(normalizeRow);

  const alerts = subs.filter(s => daysUntil(s.next_billing_date) <= (s.remind_days || 7));

  if (!alerts.length) {
    console.log('✅ 今天沒有即將到期的訂閱');
    return res.json({ ok: true, count: 0 });
  }

  function myActualCost(s) {
    const CYCLE_TO_MONTHS = { monthly: 1, quarterly: 3, yearly: 12, weekly: 0.23 };
    if (s.plan_type === 'member') return s.my_share || 0;
    if (s.plan_type === 'organizer') {
      const membersTotal = (s.members || []).reduce((sum, m) => sum + (m.amount || 0), 0);
      return Math.max(0, s.amount - membersTotal);
    }
    return s.amount;
  }

  const rates = await getRates();

  const lines = alerts.map(s => {
    const days = daysUntil(s.next_billing_date);
    const urgency = days <= 0 ? '🔴' : days <= 3 ? '🟠' : '🟡';
    const dueText = days < 0 ? `已逾期 ${-days} 天` : days === 0 ? '今天到期！' : `${days} 天後到期`;
    const cost = formatCost(myActualCost(s), s.currency, rates);
    const costLabel = s.plan_type === 'member' ? `我分攤 ${cost}` : cost;
    return `${urgency} *${s.name}* — ${costLabel}（${dueText}）\n   📅 ${s.next_billing_date}  💳 ${s.payment || '未設定'}`;
  }).join('\n\n');

  const text = `📋 *訂閱到期提醒*\n\n${lines}\n\n_共 ${alerts.length} 筆，續訂後請按下方按鈕更新到下一期_`;

  const reply_markup = {
    inline_keyboard: alerts.map(s => [{
      text: `✅ ${s.name} 已續訂`,
      callback_data: `renew:${s.id}:${s.next_billing_date}`,
    }]),
  };

  await sendMessage(text, { reply_markup });
  console.log(`✅ 已發送 ${alerts.length} 筆到期提醒`);
  return res.json({ ok: true, count: alerts.length });
}
