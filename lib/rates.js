import sql from './db';

const DEFAULT_RATES = { TWD: 1, USD: 32, JPY: 0.22, EUR: 35 };
const CACHE_TTL = 24 * 60 * 60 * 1000;
const SYMBOLS = { TWD: 'NT$', USD: 'US$', JPY: '¥', EUR: '€' };

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

// 匯率來源：DB 快取（24h）→ 過期則抓新的寫回 → 整段失敗才退回寫死的預設值。
// 前端 /api/rates 與 cron 通知共用同一份，避免兩邊換算結果不一致。
export async function getRates() {
  try {
    const [cached] = await sql`SELECT rates, updated_at FROM rates_cache WHERE id = 1`;
    if (cached && Date.now() - new Date(cached.updated_at).getTime() < CACHE_TTL) {
      return cached.rates;
    }
    const rates = await fetchFreshRates();
    await sql`
      INSERT INTO rates_cache (id, rates, updated_at) VALUES (1, ${JSON.stringify(rates)}::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET rates = EXCLUDED.rates, updated_at = EXCLUDED.updated_at
    `;
    return rates;
  } catch {
    return DEFAULT_RATES;
  }
}

function formatMoney(amount, currency) {
  const symbol = SYMBOLS[currency] || `${currency} `;
  // 台幣進位到整數（沿用原本通知的呈現），外幣保留小數以免 54.99 被寫成 55
  const value = currency === 'TWD' ? Math.round(amount) : Math.round(amount * 100) / 100;
  return `${symbol}${value.toLocaleString()}`;
}

// 外幣顯示成「US$20（約 NT$637）」，台幣就只顯示台幣
export function formatCost(amount, currency, rates) {
  const cur = currency || 'TWD';
  const original = formatMoney(amount, cur);
  if (cur === 'TWD') return original;
  const twd = amount * (rates[cur] || 1);
  return `${original}（約 ${formatMoney(twd, 'TWD')}）`;
}

export { DEFAULT_RATES };
