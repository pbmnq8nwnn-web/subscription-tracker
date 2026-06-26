import { getSession } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { password } = req.body;
  if (!password || password !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: '密碼錯誤' });
  }

  const session = await getSession(req, res);
  session.authenticated = true;
  await session.save();
  return res.json({ ok: true });
}
