import sql, { normalizeRow } from '../../../lib/db';
import { sendMessage, answerCallback } from '../../../lib/telegram';
import { advanceDate } from '../../../lib/renew';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const secret = req.headers['x-telegram-bot-api-secret-token'];
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return res.status(403).end();
  }

  const { callback_query } = req.body;
  if (!callback_query) return res.status(200).end();

  const m = (callback_query.data || '').match(/^renew:(\d+):(\d{4}-\d{2}-\d{2})$/);
  if (!m) {
    await answerCallback(callback_query.id, '無法辨識的操作');
    return res.status(200).end();
  }

  const [, id, expectedDate] = m;
  const [sub] = await sql`SELECT * FROM subscriptions WHERE id = ${id}`;

  if (!sub) {
    await answerCallback(callback_query.id, '找不到這筆訂閱');
    return res.status(200).end();
  }

  const normalized = normalizeRow(sub);
  if (normalized.next_billing_date !== expectedDate) {
    await answerCallback(callback_query.id, `已更新過了（目前 ${normalized.next_billing_date}）`);
    return res.status(200).end();
  }

  const newDate = advanceDate(normalized.next_billing_date, normalized.cycle);
  await sql`UPDATE subscriptions SET next_billing_date = ${newDate} WHERE id = ${id}`;
  await answerCallback(callback_query.id, '已更新');
  await sendMessage(`✅ *${normalized.name}* 已續到 ${newDate}`);

  return res.status(200).end();
}
