"""Bridge result page: the bridge switcher sits on top, and tapping a lit island crosses the bridge straight into it."""
from playwright.sync_api import sync_playwright
from pathlib import Path
OUT=str(Path('/tmp/isu-islands-bridge'))+'/';Path(OUT).mkdir(exist_ok=True)
with sync_playwright() as p:
  b=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  results=[]
  for w,h,lang in [(1440,900,'zh'),(1440,900,'en'),(390,844,'zh')]:
    pg=b.new_page(viewport={'width':w,'height':h},locale='zh-TW' if lang=='zh' else 'en-US')
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://127.0.0.1:8000/');pg.wait_for_function('window.__app?.flow && document.querySelector(".title")');pg.wait_for_timeout(800)
    pg.evaluate('(lang)=>{const a=__app,f=a.flow;f.titleEl.remove();a.updaters=[];f.narrator.pause();if(document.documentElement.lang.startsWith("zh")!==(lang==="zh"))f.toggleLang();a.setStage("campus");a.arch.group.visible=true;f.s.life=["stay"];f.s.homeLabel="Vietnam";f.bridgeStep();}',lang)
    pg.wait_for_selector('.panel.in[data-key=bridge-questions]');panel=pg.locator('.panel.in')
    panel.locator('[data-country=VN]').evaluate('n=>n.click()')
    for q,v in [('route','degree'),('edu','hs'),('lang','zh'),('bg','none')]: panel.locator(f'[data-question={q}] [data-answer={v}]').evaluate('n=>n.click()')
    panel.locator('.panel-foot .btn').last.click();pg.wait_for_selector('.panel.in[data-key^=bridge-result]');pg.wait_for_timeout(2500)
    dims=pg.evaluate('[...document.querySelectorAll(".hotspot.island")].map(n=>n.innerText.split("\\n").pop()+(n.classList.contains("dim")?"(dim)":""))')
    pg.screenshot(path=OUT+f'bridge-result-{w}-{lang}.png')
    pg.locator('.hotspot.island').filter(has_text='企業島' if lang=='zh' else 'Business').first.evaluate('n=>n.click()')
    pg.wait_for_function('document.querySelector(".panel.in")?.dataset.key?.startsWith("island-")',timeout=15000)
    landed=pg.evaluate('[document.querySelector(".panel.in").dataset.key,__app.flow.s.bridge]')
    assert landed==['island-business-directory','zh'],landed
    assert not errs,errs
    results.append((w,lang))
    if w==1440 and lang=='zh':
      # a bridge that doesn't fit (English, for a Chinese-speaking student) still opens as a preview
      pg.evaluate('()=>__app.flow.bridgeStep()');pg.wait_for_selector('.panel.in[data-key=bridge-questions]')
      pg.locator('.panel.in .panel-foot .btn').last.click();pg.wait_for_selector('.panel.in[data-key^=bridge-result]');pg.wait_for_timeout(800)
      pg.locator('.panel.in .mini-bridge').filter(has_text='英文橋').click();pg.wait_for_timeout(1200)
      assert pg.evaluate('__app.arch.bridgeMeshes.length')>0
      assert '英文橋' in pg.locator('.panel.in .bridge-warn').inner_text()
      assert pg.locator('.panel.in .panel-foot .btn').last.is_disabled()
      pg.locator('.hotspot.island').filter(has_text='企業島').first.evaluate('n=>n.click()')
      pg.wait_for_function('document.querySelector(".panel.in")?.dataset.key?.startsWith("island-business")',timeout=15000)
    pg.close()
  b.close()
  print({'bridge_shortcut':results})
