import sql, { normalizeRow } from '../../../lib/db';
import { sendMessage, answerCallback, escapeMarkdown } from '../../../lib/telegram';
import { advanceDate } from '../../../lib/renew';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const secret = req.headers['x-telegram-bot-api-secret-token'];
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return res.status(403).end();
  }

  const { callback_query } = req.body;
  if (!callback_query) return res.status(200).end();

  const m = (callback_query.data || '').match(/^(renew|cancel):(\d+):(\d{4}-\d{2}-\d{2})$/);
  if (!m) {
    await answerCallback(callback_query.id, '無法辨識的操作');
    return res.status(200).end();
  }

  const [, action, id, expectedDate] = m;
  const [sub] = await sql`SELECT * FROM subscriptions WHERE id = ${id}`;

  if (!sub) {
    await answerCallback(callback_query.id, '找不到這筆訂閱');
    return res.status(200).end();
  }

  const normalized = normalizeRow(sub);
  if (normalized.status === 'cancelled') {
    await answerCallback(callback_query.id, '這筆已經取消了');
    return res.status(200).end();
  }

  // 取消跟日期無關，天生冪等，不用比對 expectedDate（避免先按了「已續訂」推進日期後，
  // 想反悔按「不續了」卻被下面的日期比對擋掉，導致取消沒生效）
  if (action === 'cancel') {
    await sql`UPDATE subscriptions SET status = 'cancelled' WHERE id = ${id}`;
    await answerCallback(callback_query.id, '已標記取消');
    await sendMessage(`🚫 *${escapeMarkdown(normalized.name)}* 已標記為取消，之後不會再提醒`);
    return res.status(200).end();
  }

  if (normalized.next_billing_date !== expectedDate) {
    await answerCallback(callback_query.id, `已更新過了（目前 ${normalized.next_billing_date}）`);
    return res.status(200).end();
  }

  const newDate = advanceDate(normalized.next_billing_date, normalized.cycle);
  await sql`UPDATE subscriptions SET next_billing_date = ${newDate} WHERE id = ${id}`;
  await answerCallback(callback_query.id, '已更新');
  await sendMessage(`✅ *${escapeMarkdown(normalized.name)}* 已續到 ${newDate}`);

  return res.status(200).end();
}
