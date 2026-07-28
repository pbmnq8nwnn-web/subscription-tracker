import { requireAuth } from '../../lib/auth';
import { getRates } from '../../lib/rates';

export default async function handler(req, res) {
  if (!(await requireAuth(req, res))) return;
  if (req.method !== 'GET') return res.status(405).end();

  return res.json(await getRates());
}
