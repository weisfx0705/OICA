#!/bin/bash
# 雙擊即可啟動本機伺服器並打開「空中群島」。關閉這個視窗就會停止伺服器。
cd "$(dirname "$0")" || exit 1

PORT=8000
while lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done

URL="http://localhost:$PORT/"
echo "空中群島 Islands in the Sky"
echo "網址：$URL"
echo "關閉這個視窗即可停止伺服器。"
echo

( sleep 1; open "$URL" ) &
exec python3 -m http.server "$PORT" --bind 127.0.0.1
