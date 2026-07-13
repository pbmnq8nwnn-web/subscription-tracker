import { createHash, timingSafeEqual } from 'crypto';
import { getSession } from '../../../lib/auth';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 密碼比對用 hash 後的固定長度 buffer 做 timingSafeEqual，避免長度不同直接 throw，
// 也避免原本 !== 字串比對理論上的 timing side-channel。
function passwordMatches(input, expected) {
  if (!input || !expected) return false;
  const a = createHash('sha256').update(input).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { password } = req.body;
  if (!passwordMatches(password, process.env.APP_PASSWORD)) {
    // 失敗故意拖一下，提高暴力猜密碼的成本（單一密碼、公開網址，沒有帳號鎖定機制可用）
    await sleep(500);
    return res.status(401).json({ error: '密碼錯誤' });
  }

  const session = await getSession(req, res);
  session.authenticated = true;
  await session.save();
  return res.json({ ok: true });
}
