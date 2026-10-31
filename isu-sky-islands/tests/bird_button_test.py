"""Panel header: the "Bird's-eye map" button folds the panel and flies out over the whole archipelago."""
from pathlib import Path
OUT='/tmp/isu-islands-bird/';Path(OUT).mkdir(exist_ok=True)
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
  b=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  for w,h,lang in [(1440,900,'zh'),(390,844,'zh'),(390,844,'en')]:
    pg=b.new_page(viewport={'width':w,'height':h},locale='zh-TW' if lang=='zh' else 'en-US');errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://127.0.0.1:8000/');pg.wait_for_function('window.__app?.flow && document.querySelector(".title")');pg.wait_for_timeout(800)
    pg.evaluate('()=>{const a=__app,f=a.flow;f.titleEl.remove();a.updaters=[];f.narrator.pause();a.setStage("campus");a.arch.group.visible=true;Object.assign(f.s,{country:"VN",life:["stay"],bridge:"intense",answers:{route:"industry",edu:"bachelor",goal:"bachelor",lang:"en",bg:"none",exp:"none"}});f.focusIsland("chip","equip");}')
    pg.wait_for_timeout(3500)
    # the header button reuses the view dock's bird's-eye action
    assert pg.evaluate('!!document.querySelector(".view-dock [data-icon=bird]")')
    btn=pg.locator('.panel.in .ph-bird');assert btn.is_visible()
    pg.screenshot(path=OUT+f'b-before-{w}-{lang}.png')
    cam0=pg.evaluate('__app.camera.position.y')
    btn.click();pg.wait_for_timeout(2500)
    st=pg.evaluate('()=>({collapsed:document.querySelector(".panel.in").classList.contains("collapsed"),y:__app.camera.position.y})')
    assert st['collapsed'] and st['y']>cam0+30,(w,lang,cam0,st)
    assert pg.locator('.panel.in .ph-bird').is_hidden()
    pg.screenshot(path=OUT+f'b-after-{w}-{lang}.png')
    # the ordinary fold toggle still works
    pg.locator('.panel.in .ph-toggle').click();pg.wait_for_timeout(500)
    assert not pg.evaluate('document.querySelector(".panel.in").classList.contains("collapsed")')
    assert not errs,errs
  print('Bird\'s-eye header button passed: folds the panel, flies out to the whole map, the fold toggle still reopens it (desktop and phone, zh/en).')
