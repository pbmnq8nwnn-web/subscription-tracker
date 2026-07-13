// 一次性資料遷移：把本機 subscriptions.json 匯入 Neon 資料庫
// 執行方式：node --env-file=.env.local scripts/migrate.mjs

import { neon } from '@neondatabase/serverless';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = neon(process.env.DATABASE_URL);

async function main() {
  // 建立資料表
  await sql`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '其他',
      status TEXT NOT NULL DEFAULT 'active',
      amount NUMERIC NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'TWD',
      cycle TEXT NOT NULL DEFAULT 'monthly',
      next_billing_date DATE NOT NULL,
      payment TEXT NOT NULL DEFAULT '',
      remind_days INTEGER NOT NULL DEFAULT 7,
      notes TEXT NOT NULL DEFAULT '',
      plan_type TEXT NOT NULL DEFAULT 'solo',
      my_share NUMERIC NOT NULL DEFAULT 0,
      pay_to TEXT NOT NULL DEFAULT '',
      members JSONB NOT NULL DEFAULT '[]'
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS rates_cache (
      id INTEGER PRIMARY KEY DEFAULT 1,
      rates JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  console.log('✅ 資料表建立完成');

  // 讀取本機 JSON（新部署者通常沒有這個檔，純建表即可，不算錯誤）
  const dataPath = join(__dirname, '../subscriptions.json');
  if (!existsSync(dataPath)) {
    console.log('ℹ️ 沒有找到 subscriptions.json，略過匯入（僅建表，這是正常情況）');
    return;
  }
  const subs = JSON.parse(readFileSync(dataPath, 'utf-8'));
  console.log(`📦 讀到 ${subs.length} 筆訂閱`);

  // 逐筆匯入（衝突時跳過）
  let imported = 0;
  let skipped = 0;
  for (const s of subs) {
    try {
      await sql`
        INSERT INTO subscriptions (id, name, category, status, amount, currency, cycle, next_billing_date, payment, remind_days, notes, plan_type, my_share, pay_to, members)
        VALUES (
          ${s.id}, ${s.name}, ${s.category || '其他'}, ${s.status || 'active'},
          ${s.amount || 0}, ${s.currency || 'TWD'}, ${s.cycle || 'monthly'},
          ${s.next_billing_date}, ${s.payment || ''}, ${s.remind_days || 7},
          ${s.notes || ''}, ${s.plan_type || 'solo'}, ${s.my_share || 0},
          ${s.pay_to || ''}, ${JSON.stringify(s.members || [])}::jsonb
        )
        ON CONFLICT (id) DO NOTHING
      `;
      console.log(`  ✓ ${s.name}`);
      imported++;
    } catch (e) {
      console.log(`  ✗ ${s.name}：${e.message}`);
      skipped++;
    }
  }

  console.log(`\n完成！匯入 ${imported} 筆，跳過 ${skipped} 筆`);
}

main().catch(e => { console.error(e); process.exit(1); });
