"""Starting point: the wanted degree decides which programs light up across the bridge."""
from playwright.sync_api import sync_playwright
from pathlib import Path
OUT=str(Path('/tmp/isu-islands-goal'))+'/';Path(OUT).mkdir(exist_ok=True)
with sync_playwright() as p:
  b=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  for w,h,lang in [(1440,900,'zh'),(390,844,'en')]:
    pg=b.new_page(viewport={'width':w,'height':h},locale='zh-TW' if lang=='zh' else 'en-US')
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://127.0.0.1:8000/');pg.wait_for_function('window.__app?.flow && document.querySelector(".title")');pg.wait_for_timeout(800)
    pg.evaluate('(lang)=>{const a=__app,f=a.flow;f.titleEl.remove();a.updaters=[];f.narrator.pause();if(document.documentElement.lang.startsWith("zh")!==(lang==="zh"))f.toggleLang();a.setStage("campus");a.arch.group.visible=true;f.s.life=["stay"];f.bridgeStep();}',lang)
    pg.wait_for_selector('.panel.in[data-key=bridge-questions]');panel=pg.locator('.panel.in')
    click=lambda q,v:panel.locator(f'[data-question={q}] [data-answer={v}]').evaluate('n=>n.click()')
    assert panel.locator('[data-question=goal] [data-answer]').count()==5
    panel.locator('[data-country=VN]').evaluate('n=>n.click()')
    # a high-school student can't pick a PhD
    click('route','degree');click('edu','hs')
    assert 'blocked' in panel.locator('[data-question=goal] [data-answer=phd]').get_attribute('class')
    # "IFP first" also switches the study route to Mandarin
    click('goal','ifp');assert panel.locator('[data-question=route] [data-answer=mandarin]').get_attribute('aria-pressed')=='true'
    click('route','degree');assert pg.evaluate('__app.flow.s.answers.goal')is None
    # a master's graduate who wants a PhD in Chinese: the five doctoral programs light up
    for q,v in [('edu','master'),('goal','phd'),('lang','zh'),('bg','none'),('exp','none')]:click(q,v)
    pg.locator('.panel.in .panel-foot .btn').last.evaluate('n=>n.click()');pg.wait_for_selector('.panel.in[data-key^=bridge-result]');pg.wait_for_timeout(800)
    assert pg.evaluate('__app.flow.s.primary')=='zh'
    pg.screenshot(path=OUT+f'phd-{w}-{lang}.png')
    pg.locator('.panel.in .panel-foot .btn').last.click()
    pg.wait_for_function('document.querySelector(".panel.in")?.dataset.key?.startsWith("island-")||document.querySelector(".panel.in")?.dataset.key==="islands"',timeout=15000);pg.wait_for_timeout(1500)
    pg.evaluate('()=>__app.flow.focusIsland("chip","ee")');pg.wait_for_timeout(1500)
    text=pg.locator('.panel.in').inner_text()
    assert ('博士班' if lang=='zh' else 'Doctoral') in text,text[:300]
    assert ('系所網站' if lang=='zh' else 'graduate research') in text
    pg.screenshot(path=OUT+f'phd-ee-{w}-{lang}.png')
    # the same wish in English: every doctoral program is Chinese-taught, and the page says so
    pg.evaluate('()=>__app.flow.bridgeStep()');pg.wait_for_selector('.panel.in[data-key=bridge-questions]');pg.wait_for_timeout(2500);panel=pg.locator('.panel.in[data-key=bridge-questions]')
    click('lang','en');pg.wait_for_timeout(300)
    pg.locator('.panel.in[data-key=bridge-questions] .panel-foot .btn').last.evaluate('n=>n.click()');pg.wait_for_selector('.panel.in[data-key^=bridge-result]');pg.wait_for_timeout(800)
    warn=pg.locator('.panel.in .bridge-warn').inner_text()
    assert ('中文授課' if lang=='zh' else 'taught in Chinese') in warn,warn
    assert pg.locator('.panel.in .panel-foot .btn').last.is_disabled()
    # a master's in English leads to IMBA only
    pg.evaluate('()=>__app.flow.bridgeStep()');pg.wait_for_selector('.panel.in[data-key=bridge-questions]');pg.wait_for_timeout(2500);panel=pg.locator('.panel.in[data-key=bridge-questions]')
    click('goal','master');pg.wait_for_timeout(300)
    pg.locator('.panel.in[data-key=bridge-questions] .panel-foot .btn').last.evaluate('n=>n.click()');pg.wait_for_selector('.panel.in[data-key^=bridge-result]');pg.wait_for_timeout(800)
    pg.locator('.panel.in .panel-foot .btn').last.click();pg.wait_for_timeout(3000)
    assert pg.evaluate('__app.flow.s.bridge')=='en'
    assert pg.evaluate('[__app.flow.s.pendingIsland,__app.flow.s.pendingProgram]')==['business','imba']
    assert not errs,errs
  print('Goal checks passed: the wanted degree greys out conflicts, keeps IFP in step, lights PhD or master programs, and explains when none is taught in your language.')
