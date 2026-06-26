import sql from '../../lib/db';
import { requireAuth } from '../../lib/auth';

const DEFAULT_RATES = { TWD: 1, USD: 32, JPY: 0.22, EUR: 35 };
const CACHE_TTL = 24 * 60 * 60 * 1000;

async function fetchFreshRates() {
  const res = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json');
  const r = (await res.json()).usd;
  const twdPerUsd = r.twd;
  return {
    TWD: 1,
    USD: Math.round(twdPerUsd * 100) / 100,
    JPY: Math.round((twdPerUsd / r.jpy) * 100) / 100,
    EUR: Math.round((twdPerUsd / r.eur) * 100) / 100,
  };
}

export default async function handler(req, res) {
  if (!(await requireAuth(req, res))) return;
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const [cached] = await sql`SELECT rates, updated_at FROM rates_cache WHERE id = 1`;
    if (cached && Date.now() - new Date(cached.updated_at).getTime() < CACHE_TTL) {
      return res.json(cached.rates);
    }
    const rates = await fetchFreshRates();
    await sql`
      INSERT INTO rates_cache (id, rates, updated_at) VALUES (1, ${JSON.stringify(rates)}::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET rates = EXCLUDED.rates, updated_at = EXCLUDED.updated_at
    `;
    return res.json(rates);
  } catch {
    return res.json(DEFAULT_RATES);
  }
}
