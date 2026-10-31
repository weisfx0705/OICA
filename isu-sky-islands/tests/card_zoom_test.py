"""Route card: tap the preview to enlarge it, tap again for full size, tap outside to close."""
from pathlib import Path
OUT='/tmp/isu-islands-card/';Path(OUT).mkdir(exist_ok=True)
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
  b=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  for w,h,lang in [(1440,900,'zh'),(390,844,'en')]:
    pg=b.new_page(viewport={'width':w,'height':h},locale='zh-TW' if lang=='zh' else 'en-US');errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://127.0.0.1:8000/');pg.wait_for_function('window.__app?.flow && document.querySelector(".title")');pg.wait_for_timeout(800)
    pg.evaluate('()=>{const a=__app,f=a.flow;f.titleEl.remove();a.updaters=[];f.narrator.pause();a.setStage("campus");a.arch.group.visible=true;Object.assign(f.s,{country:"VN",homeLabel:document.documentElement.lang.startsWith("zh")?"越南":"Vietnam",life:["stay"],bridge:"zh",answers:{route:"degree",edu:"master",goal:"phd",lang:"zh",bg:"none",exp:"none"},flag:{islandId:"chip",programId:"ee"}});f.routeStep();}')
    pg.wait_for_function('document.querySelector(".route-preview")?.src.startsWith("data:image/jpeg")',timeout=20000);pg.wait_for_timeout(2500)
    pg.locator('.route-preview-open').scroll_into_view_if_needed();pg.screenshot(path=OUT+f'z-panel-{w}.png')
    pg.locator('.route-preview-open').click();pg.wait_for_selector('dialog.card-viewer[open]');pg.wait_for_timeout(400)
    r=pg.evaluate('()=>{const i=document.querySelector("dialog.card-viewer img").getBoundingClientRect();return [i.width,i.height,innerWidth,innerHeight]}')
    assert r[1]>pg.evaluate('document.querySelector(".route-preview").getBoundingClientRect().height')*1.4,r
    pg.screenshot(path=OUT+f'z-open-{w}.png')
    pg.locator('dialog.card-viewer img').click();pg.wait_for_timeout(300)
    z=pg.evaluate('()=>document.querySelector("dialog.card-viewer img").getBoundingClientRect().width');assert z>=min(1000,720 if w<600 else 1000) and z>r[0]*1.8,(z,r)
    pg.screenshot(path=OUT+f'z-zoom-{w}.png')
    pg.mouse.click(5,5);pg.wait_for_selector('dialog.card-viewer',state='detached',timeout=3000)
    assert not errs,errs
  print('Route card zoom passed: preview opens enlarged, a second tap shows full size, outside tap closes (desktop and phone).')
