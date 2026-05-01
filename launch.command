#!/bin/bash
PROJECT="/Users/chenszu-jung/Downloads/chen-agent/subscription-tracker"
NODE="/opt/homebrew/bin/node"

# 如果已在跑就直接開瀏覽器
if lsof -i :3456 -sTCP:LISTEN -t > /dev/null 2>&1; then
  open "http://127.0.0.1:3456"
  exit 0
fi

# 啟動 server
cd "$PROJECT"
"$NODE" server.js &
sleep 2
open "http://127.0.0.1:3456"
