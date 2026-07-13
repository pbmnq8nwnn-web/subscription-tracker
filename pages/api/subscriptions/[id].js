import sql, { normalizeRow } from '../../../lib/db';
import { requireAuth } from '../../../lib/auth';
import { validate, sanitize } from '../../../lib/validation';

export default async function handler(req, res) {
  if (!(await requireAuth(req, res))) return;

  const { id } = req.query;
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: '無效的 ID' });

  if (req.method === 'PUT') {
    const err = validate(req.body);
    if (err) return res.status(400).json({ error: err });
    const data = sanitize(req.body);
    const [row] = await sql`
      UPDATE subscriptions SET
        name = ${data.name}, category = ${data.category}, status = ${data.status},
        amount = ${data.amount}, currency = ${data.currency}, cycle = ${data.cycle},
        next_billing_date = ${data.next_billing_date}, payment = ${data.payment},
        remind_days = ${data.remind_days}, notes = ${data.notes}, plan_type = ${data.plan_type},
        my_share = ${data.my_share}, pay_to = ${data.pay_to},
        members = ${JSON.stringify(data.members)}::jsonb
      WHERE id = ${id}
      RETURNING *
    `;
    if (!row) return res.status(404).json({ error: 'not found' });
    return res.json(normalizeRow(row));
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM subscriptions WHERE id = ${id}`;
    return res.json({ ok: true });
  }

  res.status(405).end();
}
