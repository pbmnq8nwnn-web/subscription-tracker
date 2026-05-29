#!/bin/bash
# 開啟訂閱管理工具網頁。
# server 本身由 launchd（com.leo.subscription-server）在背景常駐，
# 這個檔只負責開瀏覽器，不再自己啟動 node、不綁終端機視窗。

URL="http://127.0.0.1:3456"

# 若 server 還沒起來（剛重開機等情況），叫醒 launchd agent 再等它就緒
if ! lsof -i :3456 -sTCP:LISTEN -t > /dev/null 2>&1; then
  launchctl kickstart -k "gui/$(id -u)/com.leo.subscription-server" 2>/dev/null
  for i in {1..10}; do
    lsof -i :3456 -sTCP:LISTEN -t > /dev/null 2>&1 && break
    sleep 0.5
  done
fi

open "$URL"
