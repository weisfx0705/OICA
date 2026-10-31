"""Phones: panels are a lower-third sheet that grows on demand, and choosing a country jumps to the companion picker.
Tablets get a narrower side panel; desktop keeps its layout."""
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT='/tmp/isu-islands-mobile/';Path(OUT).mkdir(exist_ok=True)
sheet=lambda pg:pg.evaluate('()=>{const r=document.querySelector(".panel.in").getBoundingClientRect();return [r.top,r.height,innerHeight]}')
with sync_playwright() as p:
  b=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  for w,h,lang in [(390,844,'zh'),(375,667,'en')]:
    pg=b.new_page(viewport={'width':w,'height':h},locale='zh-TW' if lang=='zh' else 'en-US',has_touch=True,is_mobile=True)
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://127.0.0.1:8000/');pg.wait_for_function('window.__app?.flow && document.querySelector(".title")');pg.wait_for_timeout(1000)
    pg.locator('.title button').filter(has_text='開始旅程' if lang=='zh' else 'Begin the journey').first.click();pg.wait_for_timeout(1500)
    # choosing a country jumps straight to the companion picker; "change place" goes back
    pg.locator('.panel.in [data-country=VN]').click();pg.wait_for_selector('.panel.in[data-key=globe-look]')
    assert pg.locator('.panel.in .look .swatch').count()>=10
    pg.locator('.panel.in .back-step').click();pg.wait_for_selector('.panel.in [data-country=VN].on')
    # a chapter panel is a lower-third sheet (at most ~45%, or 300px on short phones)
    pg.evaluate('()=>{const a=__app,f=a.flow;f.narrator.pause();f.toTaiwan();f.taiwanStep();}');pg.wait_for_selector('.panel.in[data-key=taiwan-overview]');pg.wait_for_timeout(1500)
    pg.wait_for_selector(".panel.in[data-key=taiwan-overview]");top,height,vh=sheet(pg);assert height<=max(vh*0.45,305),(w,height,vh)
    # 展開 grows it for reading, 縮小 brings the map back
    pg.locator('.panel.in .ph-expand').click();pg.wait_for_timeout(600)
    t2,h2,_=sheet(pg);assert h2>height*1.6 and t2>=48,(w,h2,t2)
    pg.screenshot(path=OUT+f'expanded-{w}.png')
    pg.locator('.panel.in .ph-expand').click();pg.wait_for_timeout(600)
    pg.wait_for_function('!document.querySelector(".panel.in").classList.contains("expanded")');pg.wait_for_timeout(500)
    s3=sheet(pg);assert s3[1]<=max(vh*0.45,305),(w,s3,pg.evaluate('document.querySelector(".panel.in").className')) # back to the lower-third sheet
    # the starting-point questions are a form: they open grown
    pg.evaluate('()=>{const a=__app,f=a.flow;f.toCampus(true);a.arch.group.visible=true;f.s.life=["stay"];f.bridgeStep();}');pg.wait_for_selector('.panel.in[data-key=bridge-questions]');pg.wait_for_timeout(800)
    assert pg.evaluate('document.querySelector(".panel.in").classList.contains("expanded")')
    assert not errs,errs
  # tablet portrait: narrower side panel that stays under the top bar
  pg=b.new_page(viewport={'width':768,'height':1024},locale='zh-TW')
  pg.goto('http://127.0.0.1:8000/');pg.wait_for_function('window.__app?.flow && document.querySelector(".title")');pg.wait_for_timeout(800)
  pg.evaluate('()=>{const a=__app,f=a.flow;f.titleEl.remove();f.narrator.pause();f.toTaiwan();f.taiwanStep();}');pg.wait_for_selector('.panel.in[data-key=taiwan-overview]');pg.wait_for_timeout(1500)
  r=pg.evaluate('()=>{const r=document.querySelector(".panel.in").getBoundingClientRect();return [r.width,r.top]}')
  assert r[0]<=360 and r[1]>=70,r
  # desktop keeps its 420px side panel and no sheet controls
  pg=b.new_page(viewport={'width':1440,'height':900},locale='zh-TW')
  pg.goto('http://127.0.0.1:8000/');pg.wait_for_function('window.__app?.flow && document.querySelector(".title")');pg.wait_for_timeout(800)
  pg.evaluate('()=>{const a=__app,f=a.flow;f.titleEl.remove();f.narrator.pause();f.toTaiwan();f.taiwanStep();}');pg.wait_for_selector('.panel.in[data-key=taiwan-overview]');pg.wait_for_timeout(1500)
  assert pg.evaluate('document.querySelector(".panel.in").getBoundingClientRect().width')==420
  assert pg.locator('.panel.in .ph-expand').is_hidden()
  print('Mobile layout passed: lower-third sheet with grow/shrink, forms open grown, country jumps to the companion picker; tablet panel 360px under the top bar; desktop unchanged.')
