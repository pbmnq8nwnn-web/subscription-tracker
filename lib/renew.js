// 日期推進邏輯：給一個日期 (YYYY-MM-DD) 與週期，回傳推進後的下一期日期。
// 只處理日期計算，不碰資料、不碰網路，方便單獨測試。

function pad(n) { return String(n).padStart(2, '0'); }

function toStr(y, m, d) { return `${y}-${pad(m)}-${pad(d)}`; }

// 某年某月有幾天（month 為 1-12）
function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

// 加 N 個月，月底自動進位（1/31 + 1 月 → 2/28；閏年 2/29 + 12 月 → 2/28）
function addMonths(dateStr, months) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const total = (y * 12 + (m - 1)) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const nd = Math.min(d, daysInMonth(ny, nm));
  return toStr(ny, nm, nd);
}

// 加 N 天（用 UTC 避開夏令時間誤差）
function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return toStr(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

// 依週期推進一期
function advanceDate(dateStr, cycle) {
  switch (cycle) {
    case 'monthly':   return addMonths(dateStr, 1);
    case 'quarterly': return addMonths(dateStr, 3);
    case 'yearly':    return addMonths(dateStr, 12);
    case 'weekly':    return addDays(dateStr, 7);
    default:          return addMonths(dateStr, 1);
  }
}

module.exports = { advanceDate, addMonths, addDays, daysInMonth };
