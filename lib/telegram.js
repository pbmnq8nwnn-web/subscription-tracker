const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function callTelegram(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Telegram ${method} 失敗: ${res.status}`);
  return res.json();
}

export async function sendMessage(text, extra = {}) {
  return callTelegram('sendMessage', {
    chat_id: CHAT_ID,
    text,
    parse_mode: 'Markdown',
    ...extra,
  });
}

export async function answerCallback(callbackQueryId, text) {
  return callTelegram('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
  }).catch(() => {}); // 按鈕過期時靜默忽略
}

export async function setWebhook(url, secret) {
  return callTelegram('setWebhook', {
    url,
    secret_token: secret,
    allowed_updates: ['callback_query'],
  });
}

export { BOT_TOKEN, CHAT_ID };
