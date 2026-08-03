import sql, { normalizeRow } from '../../../lib/db';
import { requireAuth } from '../../../lib/auth';
import { validate, sanitize } from '../../../lib/validation';
import { advanceDate } from '../../../lib/renew';

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

  if (req.method === 'PATCH') {
    const { action } = req.body || {};
    if (action !== 'renew' && action !== 'cancel') {
      return res.status(400).json({ error: '無效的操作' });
    }

    const [sub] = await sql`SELECT * FROM subscriptions WHERE id = ${id}`;
    if (!sub) return res.status(404).json({ error: '找不到這筆訂閱' });
    const current = normalizeRow(sub);

    if (current.status === 'cancelled') {
      return res.status(409).json({ error: '這筆已經取消了' });
    }

    if (action === 'cancel') {
      const [row] = await sql`
        UPDATE subscriptions SET status = 'cancelled' WHERE id = ${id}
        RETURNING *
      `;
      return res.json(normalizeRow(row));
    }

    if (current.status !== 'active') {
      return res.status(409).json({ error: '暫停中的訂閱不能續訂，請先改回使用中' });
    }

    const newDate = advanceDate(current.next_billing_date, current.cycle);
    const [row] = await sql`
      UPDATE subscriptions SET next_billing_date = ${newDate}
      WHERE id = ${id} AND next_billing_date = ${current.next_billing_date}
      RETURNING *
    `;
    if (!row) return res.status(409).json({ error: '已更新過了，請重新整理' });
    return res.json(normalizeRow(row));
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM subscriptions WHERE id = ${id}`;
    return res.json({ ok: true });
  }

  res.status(405).end();
}
