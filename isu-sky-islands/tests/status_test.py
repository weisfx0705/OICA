"""Starting point: status and Taiwan experience are separate questions; typing China shows the red office notice."""
from playwright.sync_api import sync_playwright
from pathlib import Path
OUT=str(Path('/tmp/isu-islands-status'))+'/';Path(OUT).mkdir(exist_ok=True)
with sync_playwright() as p:
  b=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  for w,h,lang in [(1440,900,'zh'),(390,844,'en')]:
    pg=b.new_page(viewport={'width':w,'height':h},locale='zh-TW' if lang=='zh' else 'en-US')
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://127.0.0.1:8000/');pg.wait_for_function('window.__app?.flow && document.querySelector(".title")');pg.wait_for_timeout(800)
    # the student typed 中國 on the globe
    pg.evaluate('(lang)=>{const a=__app,f=a.flow;f.titleEl.remove();a.updaters=[];f.narrator.pause();if(document.documentElement.lang.startsWith("zh")!==(lang==="zh"))f.toggleLang();a.setStage("campus");a.arch.group.visible=true;f.s.life=["stay"];f.s.country="CN";f.s.homeLabelObj={zh:"中國",en:"China"};f.s.homeLabel="中國";f.bridgeStep();}',lang)
    pg.wait_for_selector('.panel.in[data-key=bridge-questions]');panel=pg.locator('.panel.in')
    assert panel.locator('[data-question=bg] [data-answer]').count()==3 and panel.locator('[data-question=exp] [data-answer]').count()==3
    assert panel.locator('[data-question=bg] [data-answer=tw]').count()==0
    for q,v in [('route','mandarin'),('edu','hs'),('goal','ifp'),('lang','none'),('bg','none'),('exp','none')]: panel.locator(f'[data-question={q}] [data-answer={v}]').evaluate('n=>n.click()')
    btn=panel.locator('.panel-foot .btn').last;assert not btn.is_disabled()
    btn.click();pg.wait_for_selector('.panel.in[data-key^=bridge-result]');pg.wait_for_timeout(1500)
    warn=pg.locator('.panel.in .mainland-warn')
    assert warn.is_visible() and ('國際及兩岸事務處' if lang=='zh' else 'Cross-Strait') in warn.inner_text()
    assert pg.locator('.panel.in .panel-foot .btn').last.is_disabled()
    assert '★' not in pg.locator('.panel.in .mini-bridges').inner_text()
    color=warn.evaluate('n=>getComputedStyle(n).borderTopColor');assert color=='rgb(200, 50, 60)',color
    pg.screenshot(path=OUT+f'mainland-{w}-{lang}.png')
    # back to the questions, pick another country, and the chosen IFP route opens normally
    warn.locator('button').click();pg.wait_for_selector('.panel.in[data-key=bridge-questions]')
    pg.locator('.panel.in [data-country=VN]').evaluate('n=>n.click()')
    pg.locator('.panel.in .panel-foot .btn').last.click();pg.wait_for_function('__app.flow.s.bridge==="ifp"',timeout=15000)
    # let the IFP flight land: wait until the open panel stays the same for 3 seconds
    key=None;same=0
    for _ in range(60):
      k=pg.evaluate('document.querySelector(".panel.in")?.dataset.key||""');same=same+1 if k==key and not k.startswith('bridge') else 0;key=k
      if same>=6:break
      pg.wait_for_timeout(500)
    assert pg.locator('.mainland-warn').count()==0
    # someone who has worked in Taiwan keeps the international bridges but not IFP
    pg.evaluate('()=>__app.flow.bridgeStep()');pg.wait_for_selector('.panel.in[data-key=bridge-questions]');panel=pg.locator('.panel.in')
    pg.wait_for_timeout(2500);panel=pg.locator(".panel.in[data-key=bridge-questions]")
    for q,v in [('route','degree'),('goal','bachelor'),('lang','en'),('exp','tw')]: panel.locator(f'[data-question={q}] [data-answer={v}]').evaluate('n=>n.click()')
    pg.wait_for_timeout(600);pg.locator('.panel.in[data-key=bridge-questions] .panel-foot .btn').last.evaluate('n=>n.click()');pg.wait_for_selector('.panel.in[data-key^=bridge-result]');pg.wait_for_timeout(800)
    s=pg.evaluate('[__app.flow.s.primary,__app.flow.s.alts]');assert s[0]=='en' and 'ifp' not in s[1],s
    assert not errs,errs
  print('Status checks passed: China shows the red office notice and a retry, status and Taiwan experience are separate questions.')
