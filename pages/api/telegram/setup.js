import { setWebhook } from '../../../lib/telegram';

// 部署後呼叫一次：GET /api/telegram/setup?secret=APP_PASSWORD
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  if (!process.env.APP_PASSWORD) return res.status(500).end();
  if (req.query.secret !== process.env.APP_PASSWORD) return res.status(403).end();

  const host = req.headers.host;
  const webhookUrl = `https://${host}/api/telegram/webhook`;
  await setWebhook(webhookUrl, process.env.TELEGRAM_WEBHOOK_SECRET);
  return res.json({ ok: true, webhookUrl });
}
