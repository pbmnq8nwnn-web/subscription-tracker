// 手動觸發測試端點，用 APP_PASSWORD 授權（與 CRON_SECRET 無關）
// 測試完成後可刪除此檔
import sql, { normalizeRow } from '../../../lib/db';
import { sendMessage } from '../../../lib/telegram';

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  if (req.query.secret !== process.env.APP_PASSWORD) return res.status(403).end();

  const rows = await sql`SELECT * FROM subscriptions WHERE status = 'active'`;
  const subs = rows.map(normalizeRow);
  const alerts = subs.filter(s => daysUntil(s.next_billing_date) <= (s.remind_days || 7));

  if (!alerts.length) return res.json({ ok: true, count: 0, msg: '沒有即將到期的訂閱' });

  function myActualCost(s) {
    if (s.plan_type === 'member') return s.my_share || 0;
    if (s.plan_type === 'organizer') {
      const membersTotal = (s.members || []).reduce((sum, m) => sum + (m.amount || 0), 0);
      return Math.max(0, s.amount - membersTotal);
    }
    return s.amount;
  }

  const lines = alerts.map(s => {
    const days = daysUntil(s.next_billing_date);
    const urgency = days <= 0 ? '🔴' : days <= 3 ? '🟠' : '🟡';
    const dueText = days < 0 ? `已逾期 ${-days} 天` : days === 0 ? '今天到期！' : `${days} 天後到期`;
    const cost = Math.round(myActualCost(s));
    const costLabel = s.plan_type === 'member' ? `我分攤 NT$${cost.toLocaleString()}` : `NT$${cost.toLocaleString()}`;
    return `${urgency} *${s.name}* — ${costLabel}（${dueText}）\n   📅 ${s.next_billing_date}  💳 ${s.payment || '未設定'}`;
  }).join('\n\n');

  const text = `📋 *訂閱到期提醒*（手動測試）\n\n${lines}\n\n_共 ${alerts.length} 筆，續訂後請按下方按鈕更新到下一期_`;
  const reply_markup = {
    inline_keyboard: alerts.map(s => [{
      text: `✅ ${s.name} 已續訂`,
      callback_data: `renew:${s.id}:${s.next_billing_date}`,
    }]),
  };

  await sendMessage(text, { reply_markup });
  return res.json({ ok: true, count: alerts.length, alerts: alerts.map(s => s.name) });
}
