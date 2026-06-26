import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export function normalizeRow(row) {
  return {
    ...row,
    amount: parseFloat(row.amount) || 0,
    my_share: parseFloat(row.my_share) || 0,
    remind_days: Number(row.remind_days) || 7,
    members: Array.isArray(row.members) ? row.members : [],
    next_billing_date: row.next_billing_date instanceof Date
      ? row.next_billing_date.toISOString().slice(0, 10)
      : String(row.next_billing_date),
  };
}

export default sql;
