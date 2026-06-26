import { getSession } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = await getSession(req, res);
  session.destroy();
  return res.json({ ok: true });
}
