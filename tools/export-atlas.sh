#!/bin/bash
# Regenerates assets/sprites/atlas.png + atlas.json from the code-generated sprites.
# Needs python3 and google-chrome. The game does NOT load these files at runtime
# (sprites are built in code); the atlas is a reference sheet for artists/review.
set -e
cd "$(dirname "$0")/.."
PORT=${PORT:-8791}
python3 -m http.server "$PORT" >/dev/null 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT
sleep 1
DOM=$(google-chrome --headless=new --no-sandbox --disable-gpu --virtual-time-budget=4000 --dump-dom "http://localhost:$PORT/tools/atlas.html" 2>/dev/null)
python3 - "$DOM" <<'PY'
import sys, re, html, base64
dom = sys.argv[1]
def grab(id_):
    m = re.search(r'<pre id="%s"[^>]*>(.*?)</pre>' % id_, dom, re.S)
    return html.unescape(m.group(1))
open('assets/sprites/atlas.json', 'w').write(grab('manifest') + '\n')
open('assets/sprites/atlas.png', 'wb').write(base64.b64decode(grab('png').split(',', 1)[1]))
print('wrote assets/sprites/atlas.png + atlas.json')
PY
