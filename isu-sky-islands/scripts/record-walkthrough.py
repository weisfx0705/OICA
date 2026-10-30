"""Record a narrated walkthrough of Islands in the Sky: GPU frames via CDP screencast + the site's own audio."""
import base64, json, pathlib, re, shutil, sys, time
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).parent
FR = ROOT / 'frames'
shutil.rmtree(FR, ignore_errors=True); FR.mkdir(parents=True)
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8000/'

INIT = r"""
(() => {
  // --- audio: tap every AudioContext that reaches its speakers and mix them into one recorder
  const orig = AudioNode.prototype.connect;
  window.__taps = [];
  const mixer = () => {
    if (!window.__mix) { window.__mix = new AudioContext(); window.__mixDest = window.__mix.createMediaStreamDestination(); }
    return window.__mix;
  };
  AudioNode.prototype.connect = function (dest, ...rest) {
    const r = orig.call(this, dest, ...rest);
    if (dest instanceof AudioDestinationNode) {
      const ctx = this.context;
      if (!ctx.__tap) {
        ctx.__tap = ctx.createMediaStreamDestination();
        const m = mixer();
        orig.call(m.createMediaStreamSource(ctx.__tap.stream), window.__mixDest);
        window.__taps.push(ctx.__tap);
      }
      orig.call(this, ctx.__tap);
    }
    return r;
  };
  window.__startRec = () => {
    const m = mixer(); m.resume();
    const rec = new MediaRecorder(window.__mixDest.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 192000 });
    window.__chunks = []; rec.ondataavailable = (e) => e.data.size && window.__chunks.push(e.data);
    rec.onstart = () => { window.__recT0 = Date.now(); };
    rec.start(1000); window.__rec = rec;
  };
  window.__stopRec = () => new Promise((res) => {
    window.__rec.onstop = async () => {
      const buf = new Uint8Array(await new Blob(window.__chunks, { type: 'audio/webm' }).arrayBuffer());
      let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
      res({ t0: window.__recT0, b64: btoa(s) });
    };
    window.__rec.stop();
  });
  // --- a visible cursor so viewers can follow each tap
  const css = `#demo-cursor{position:fixed;left:50%;top:60%;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;
    background:radial-gradient(circle at 40% 35%,#fff,rgba(255,255,255,.75));border:2.5px solid #36348E;box-shadow:0 6px 18px rgba(35,33,95,.4);
    z-index:2147483647;pointer-events:none;transition:left var(--d,.7s) cubic-bezier(.45,0,.2,1),top var(--d,.7s) cubic-bezier(.45,0,.2,1),transform .15s}
    #demo-cursor.down{transform:scale(.78)}
    .demo-ripple{position:fixed;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;border:3px solid #FFC53A;z-index:2147483646;pointer-events:none;animation:demo-rip .65s ease-out forwards}
    @keyframes demo-rip{to{transform:scale(2.6);opacity:0}}`;
  addEventListener('DOMContentLoaded', () => {
    const st = document.createElement('style'); st.textContent = css; document.head.append(st);
    const c = document.createElement('div'); c.id = 'demo-cursor'; document.body.append(c);
  });
  window.__demoMove = (x, y, d) => { const c = document.getElementById('demo-cursor'); c.style.setProperty('--d', d + 's'); c.style.left = x + 'px'; c.style.top = y + 'px'; };
  window.__demoTap = (x, y) => {
    const c = document.getElementById('demo-cursor'); c.classList.add('down'); setTimeout(() => c.classList.remove('down'), 160);
    const r = document.createElement('div'); r.className = 'demo-ripple'; r.style.left = x + 'px'; r.style.top = y + 'px'; document.body.append(r); setTimeout(() => r.remove(), 700);
  };
})();
"""

log = []
T0 = time.time()
def mark(label):
    log.append((round(time.time() - T0, 1), label)); print(f'{time.time() - T0:6.1f}s  {label}', flush=True)

with sync_playwright() as p:
    b = p.chromium.launch(channel='chromium', headless=True, args=['--autoplay-policy=no-user-gesture-required', '--ignore-gpu-blocklist'])
    ctx = b.new_context(viewport={'width': 1920, 'height': 1080}, locale='zh-TW', device_scale_factor=1)
    pg = ctx.new_page()
    pg.add_init_script(INIT)
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))

    pos = {'x': 960, 'y': 650}
    def wait(s): pg.wait_for_timeout(int(s * 1000))
    def move(x, y, d=0.75):
        pg.evaluate('([x,y,d])=>__demoMove(x,y,d)', [x, y, d]); pg.mouse.move(x, y, steps=8); wait(d + 0.08); pos.update(x=x, y=y)
    def center(loc):
        loc.scroll_into_view_if_needed(); wait(0.15)
        bb = loc.bounding_box(); return bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2
    def tap(loc, after=0.8, d=0.75):
        x, y = center(loc); move(x, y, d); pg.evaluate('([x,y])=>__demoTap(x,y)', [x, y]); pg.mouse.click(x, y); wait(after)
    def panel(): return pg.locator('.panel.in').last
    def foot(): return panel().locator('.panel-foot .btn').last
    def key(): return pg.evaluate('document.querySelector(".panel.in:last-of-type")?.dataset.key || ""')
    def until(js, timeout=40): pg.wait_for_function(js, timeout=timeout * 1000)
    def panel_key(prefix, timeout=40): until(f'[...document.querySelectorAll(".panel.in")].some(n=>(n.dataset.key||"").startsWith("{prefix}"))', timeout)
    def drag(x0, y0, x1, y1, steps=40):
        move(x0, y0, 0.5); pg.mouse.down()
        for i in range(1, steps + 1):
            x = x0 + (x1 - x0) * i / steps; y = y0 + (y1 - y0) * i / steps
            pg.evaluate('([x,y])=>__demoMove(x,y,0.02)', [x, y]); pg.mouse.move(x, y); wait(0.035)
        pg.mouse.up(); pos.update(x=x1, y=y1)
    def hotspot(text): return pg.locator('.hotspot').filter(has_text=text).first
    def lang_button(): return pg.get_by_role('button', name='Language', exact=True)

    pg.goto(URL); pg.wait_for_load_state('networkidle'); until('window.__app?.flow && document.querySelector(".title")')
    if not pg.evaluate('document.documentElement.lang.startsWith("zh")'): pg.evaluate('__app.flow.toggleLang()')
    wait(1.2)

    # ---- capture
    cdp = ctx.new_cdp_session(pg); frames = []
    def on_frame(e):
        n = len(frames); name = f'f{n:06d}.jpg'
        (FR / name).write_bytes(base64.b64decode(e['data']))
        frames.append((e['metadata']['timestamp'], name, time.time()))
        cdp.send('Page.screencastFrameAck', {'sessionId': e['sessionId']})
    cdp.on('Page.screencastFrame', on_frame)
    pg.evaluate('__startRec()')
    cdp.send('Page.startScreencast', {'format': 'jpeg', 'quality': 88, 'maxWidth': 1920, 'maxHeight': 1080, 'everyNthFrame': 2})
    wait(0.5)

    # ================= 中文 · 序章 =================
    mark('title'); wait(7)
    tap(pg.get_by_role('button', name='開始旅程', exact=True), after=3.5)

    mark('globe: type a hometown')
    until('document.querySelector(".panel.in .home-input")')
    wait(6)
    inp = panel().locator('.home-input')
    tap(inp, after=0.4); inp.press_sequentially('Surabaya', delay=120); wait(0.6)
    tap(panel().get_by_role('button', name='確定', exact=True), after=3.5)
    tap(panel().locator('.look .swatch').nth(6), after=1.6)
    tap(foot(), after=1)

    mark('flight to Taiwan')
    panel_key('taiwan', 60); wait(9)

    mark('Taiwan')
    drag(560, 640, 780, 600); wait(2.5)
    tap(hotspot('從早餐店開始的一天'), after=9)
    tap(panel().locator('.chapter-like-row .heart-button'), after=1.5)
    tap(hotspot('Night Market'), after=8)
    tap(pg.locator('.view-btn[data-icon=bird]'), after=3.5)
    tap(foot(), after=1)

    mark('Kaohsiung')
    panel_key('khh', 40); wait(11)
    tap(hotspot('搭渡輪去旗津'), after=9)
    tap(panel().locator('.chapter-like-row .heart-button'), after=1.5)
    tap(foot(), after=1)

    mark('Campus')
    panel_key('campus', 40); wait(11)
    tap(panel().locator('.chip').filter(has_text='元宇宙').first, after=8)

    # ================= English · 學習島與入學橋 =================
    mark('switch to English')
    tap(lang_button(), after=3)
    tap(foot(), after=1)

    mark('life (multi-select)')
    panel_key('life', 30); wait(6)
    tap(pg.locator('[data-life-id=stay]'), after=1)
    tap(pg.locator('[data-life-id=bridge]'), after=1.6)
    tap(foot(), after=1)

    mark('learning islands')
    panel_key('learning', 30); wait(8)
    tap(panel().locator('[data-map-filter=en]'), after=5)
    tap(panel().locator('[data-map-filter=ifp]'), after=5)
    tap(panel().locator('[data-map-filter=intense]'), after=5)
    tap(panel().locator('[data-map-filter=all]'), after=3)
    tap(hotspot('Code Isle'), after=7)
    tap(panel().locator('[data-program-id=ipai]'), after=5)
    tap(panel().get_by_role('tab').nth(1), after=5)
    tap(panel().get_by_role('tab').nth(3), after=4)
    tap(foot(), after=1)

    mark('starting point questions')
    panel_key('bridge-questions', 30); wait(5)
    q = lambda qid, v: panel().locator(f'[data-question={qid}] [data-answer={v}]')
    tap(q('route', 'industry'), after=1.2)
    tap(q('edu', 'hs'), after=3.2)          # greyed out: INTENSE needs a D3 or higher
    tap(q('route', 'degree'), after=1)
    tap(q('edu', 'hs'), after=1)
    tap(q('lang', 'en'), after=1)
    tap(q('bg', 'none'), after=1)
    tap(q('exp', 'none'), after=1.5)
    tap(foot(), after=1)

    mark('bridge result + preview another bridge')
    panel_key('bridge-result', 30); wait(7)
    tap(panel().get_by_role('button', name='Chinese Bridge', exact=True), after=8)
    tap(panel().locator('.mini-bridge').filter(has_text=re.compile(r'^English Bridge')), after=3)

    # ================= 中文 · 落腳與路線卡 =================
    mark('switch back to Chinese, cross by tapping the island')
    tap(lang_button(), after=2.5)
    tap(hotspot('程式島'), after=1)
    panel_key('island-code', 30); wait(6)
    if not panel().get_by_role('tab').count(): tap(panel().locator('[data-program-id=ipai]'), after=3)
    tap(panel().get_by_role('tab').nth(2), after=5)
    tap(pg.get_by_role('button', name='確認科系，定錨', exact=True), after=1)

    mark('anchor + route card')
    until('document.querySelector(".route-preview")?.src.startsWith("data:image")', 30); wait(9)
    card = panel().locator('.route-preview')
    x, y = center(card); move(x, y)
    for _ in range(8):
        pg.mouse.wheel(0, 220); wait(1.4)
    wait(3)
    tap(pg.locator('.view-btn[data-icon=orbit]'), after=9)
    mark('end')

    cdp.send('Page.stopScreencast'); wait(0.5)
    audio = pg.evaluate('__stopRec()')
    (ROOT / 'audio.webm').write_bytes(base64.b64decode(audio['b64']))
    (ROOT / 'frames.json').write_text(json.dumps({'frames': frames, 'audio_t0': audio['t0'], 'log': log, 'errors': errors}))
    print('frames', len(frames), 'audio bytes', len(audio['b64']) * 3 // 4, 'errors', errors)
    b.close()
