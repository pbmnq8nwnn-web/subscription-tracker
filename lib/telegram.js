// Telegram 雜事集中處：讀 .env、發訊息、收按鈕回傳。check.js 與 server.js 共用。

const fs = require('fs');
const path = require('path');
const https = require('https');

// 讀取專案根目錄的 .env（已存在的環境變數不覆蓋）
(function loadEnv() {
  const envFile = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envFile)) return;
  fs.readFileSync(envFile, 'utf-8').split('\n').forEach(line => {
    const idx = line.indexOf('=');
    if (idx === -1) return;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim();
    if (k && !(k in process.env)) process.env[k] = v;
  });
})();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

// 呼叫 Telegram Bot API，回傳 Promise。timeoutMs：連線逾時，避免半死連線卡住輪詢迴圈
function api(method, payload, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload || {});
    const opts = {
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/${method}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.ok) resolve(json.result);
          else reject(new Error(json.description || 'Telegram API 錯誤'));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error('Telegram 連線逾時')));
    req.write(body);
    req.end();
  });
}

// 發送訊息（extra 可帶 reply_markup 等）
function sendMessage(text, extra = {}) {
  return api('sendMessage', { chat_id: CHAT_ID, text, parse_mode: 'Markdown', ...extra });
}

// 回應按鈕點擊（讓 Telegram 上的轉圈停掉，可附帶提示文字）
function answerCallback(id, text) {
  return api('answerCallbackQuery', { callback_query_id: id, text: text || '' });
}

// 長輪詢取得更新（只要按鈕事件）。client 端逾時設得比長輪詢秒數更長，避免半開連線卡死迴圈
function getUpdates(offset, timeout = 30) {
  return api('getUpdates', { offset, timeout, allowed_updates: ['callback_query'] }, timeout * 1000 + 15000);
}

module.exports = { api, sendMessage, answerCallback, getUpdates, BOT_TOKEN, CHAT_ID };
