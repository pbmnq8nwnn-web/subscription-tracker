import sql, { normalizeRow } from '../../../lib/db';
import { requireAuth } from '../../../lib/auth';
import { validate, sanitize } from '../../../lib/validation';

export default async function handler(req, res) {
  if (!(await requireAuth(req, res))) return;

  if (req.method === 'GET') {
    const rows = await sql`SELECT * FROM subscriptions ORDER BY next_billing_date ASC`;
    return res.json(rows.map(normalizeRow));
  }

  if (req.method === 'POST') {
    const err = validate(req.body);
    if (err) return res.status(400).json({ error: err });
    const data = sanitize(req.body);
    const id = Date.now().toString();
    const [row] = await sql`
      INSERT INTO subscriptions (id, name, category, status, amount, currency, cycle, next_billing_date, payment, remind_days, notes, plan_type, my_share, pay_to, members)
      VALUES (${id}, ${data.name}, ${data.category}, ${data.status}, ${data.amount}, ${data.currency}, ${data.cycle}, ${data.next_billing_date}, ${data.payment}, ${data.remind_days}, ${data.notes}, ${data.plan_type}, ${data.my_share}, ${data.pay_to}, ${JSON.stringify(data.members)}::jsonb)
      RETURNING *
    `;
    return res.json(normalizeRow(row));
  }

  res.status(405).end();
}
