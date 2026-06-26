import sql, { normalizeRow } from '../../../lib/db';
import { requireAuth } from '../../../lib/auth';

const VALID_CATEGORIES = ['娛樂', '工具', '雲端', '健康', '新聞', '教育', '其他'];
const VALID_CYCLES = ['monthly', 'yearly', 'quarterly', 'weekly'];
const VALID_CURRENCIES = ['TWD', 'USD', 'JPY', 'EUR'];
const VALID_STATUSES = ['active', 'paused', 'cancelled'];
const VALID_PLAN_TYPES = ['solo', 'member', 'organizer'];

function validate(body) {
  const { name, amount, next_billing_date, category, cycle, currency, status, remind_days, plan_type, my_share, members } = body;
  if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 100) return '無效的服務名稱';
  if (amount === undefined || isNaN(+amount) || +amount < 0 || +amount > 9999999) return '無效的費用';
  if (!next_billing_date || !/^\d{4}-\d{2}-\d{2}$/.test(next_billing_date)) return '無效的日期格式';
  if (category && !VALID_CATEGORIES.includes(category)) return '無效的分類';
  if (cycle && !VALID_CYCLES.includes(cycle)) return '無效的週期';
  if (currency && !VALID_CURRENCIES.includes(currency)) return '無效的幣別';
  if (status && !VALID_STATUSES.includes(status)) return '無效的狀態';
  if (remind_days !== undefined && (isNaN(+remind_days) || +remind_days < 1 || +remind_days > 90)) return '無效的提醒天數';
  if (plan_type && !VALID_PLAN_TYPES.includes(plan_type)) return '無效的付款角色';
  if (my_share !== undefined && (isNaN(+my_share) || +my_share < 0)) return '無效的分攤金額';
  if (members !== undefined && !Array.isArray(members)) return '無效的成員資料';
  return null;
}

function sanitize(body) {
  const members = Array.isArray(body.members)
    ? body.members.map(m => ({
        id: String(m.id || Date.now()).slice(0, 30),
        name: String(m.name || '').trim().slice(0, 50),
        amount: parseFloat(m.amount) || 0,
        paid: Boolean(m.paid),
      })).filter(m => m.name)
    : [];
  return {
    name: String(body.name || '').trim().slice(0, 100),
    category: VALID_CATEGORIES.includes(body.category) ? body.category : '其他',
    status: VALID_STATUSES.includes(body.status) ? body.status : 'active',
    amount: parseFloat(body.amount) || 0,
    currency: VALID_CURRENCIES.includes(body.currency) ? body.currency : 'TWD',
    cycle: VALID_CYCLES.includes(body.cycle) ? body.cycle : 'monthly',
    next_billing_date: body.next_billing_date,
    payment: String(body.payment || '').trim().slice(0, 100),
    remind_days: Math.min(90, Math.max(1, parseInt(body.remind_days) || 7)),
    notes: String(body.notes || '').trim().slice(0, 500),
    plan_type: VALID_PLAN_TYPES.includes(body.plan_type) ? body.plan_type : 'solo',
    my_share: parseFloat(body.my_share) || 0,
    pay_to: String(body.pay_to || '').trim().slice(0, 50),
    members,
  };
}

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
