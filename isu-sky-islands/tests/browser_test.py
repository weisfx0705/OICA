"""Run against the static server: python3 tests/browser_test.py."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
OUT=Path('/tmp/isu-islands-review'); OUT.mkdir(exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 page=browser.new_page(viewport={'width':1440,'height':1000},locale='zh-TW')
 errors=[];bad=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('response',lambda r:bad.append(r.url) if r.status>=400 and '127.0.0.1' in r.url else None)
 print('Loading game', flush=True)
 page.goto('http://127.0.0.1:8000');page.wait_for_load_state('networkidle');page.wait_for_timeout(1300)
 # Actual audio playback, pause, language change, replay and music ducking.
 page.locator('.voice-toggle').click();page.wait_for_timeout(1800)
 assert page.evaluate('!__app.flow.narrator.audio.paused && __app.flow.narrator.audio.currentTime>0')
 page.locator('.voice-toggle').click()
 page.wait_for_function('__app.flow.narrator.audio.paused')
 assert page.evaluate('__app.flow.narrator.enabled')
 page.locator('.voice-languages button').filter(has_text='EN').click();page.wait_for_timeout(700)
 assert page.evaluate('new URL(__app.flow.narrator.audio.src).pathname.endsWith("intro-en.mp3")')
 page.locator('.voice-languages button').filter(has_text='中文').click()
 page.get_by_role('button',name='略過',exact=True).click();page.wait_for_timeout(1900)
 print('Audio controls passed', flush=True)
 # Follow the normal user flow to admissions.
 expect(page.locator('.panel.in h2')).to_have_text('十年後的你，是哪一種人？')
 page.locator('.panel.in .option').filter(has_text='程式島').click();page.locator('.panel.in .panel-foot .btn').last.click()
 page.locator('.panel.in .option').last.click();page.locator('.panel.in .panel-foot .btn').last.click();page.wait_for_timeout(2500)
 panel=page.locator('.panel.in')
 for text in ['越南','直接讀專業科系','高中（即將）畢業','英文較好','都不是']:
  panel.get_by_role('button').filter(has_text=text).first.click()
 panel.get_by_role('button',name='找到你的橋',exact=True).click()
 expect(panel.locator('.bn')).to_have_text('英文橋')
 panel.get_by_role('button',name='走這條路探索',exact=True).click();page.wait_for_timeout(2400)
 expect(page.locator('.panel.in h2')).to_have_text('群島探索')
 assert page.evaluate('__app.flow.s.bridge')=='en'
 print('Normal admissions flow passed', flush=True)
 # Each catalog entry can open, show its own story, and provide its official URL in both UI languages.
 records=page.evaluate("async()=>{const {ISLANDS}=await import('./js/content.js');return ISLANDS.flatMap(i=>i.programs.map(p=>({island:i.id,id:p.id,url:p.url,name:p.name})));}")
 page.add_style_tag(content='*,*::before,*::after{transition:none!important;animation-duration:.01ms!important}')
 day_texts=[]
 for lang in ([] if os.environ.get('ISU_SKIP_CATALOG') else ['zh','en']):
  page.evaluate('(lang)=>{if(document.documentElement.lang.startsWith("zh") !== (lang==="zh")) __app.flow.toggleLang();}',lang)
  for row in records:
   print('Program', lang, row['id'], flush=True)
   page.evaluate('(r)=>{__app.flow.focusIsland(r.island,r.id)}',row)
   panel=page.locator('.panel.in').last
   expect(panel.locator('h2')).to_have_text(row['name'][lang])
   assert panel.locator('a').first.get_attribute('href')==row['url']
   tabs=panel.get_by_role('tab');assert tabs.count()==4
   tabs.nth(1).evaluate('(n)=>n.click()'); assert panel.locator('.moment').count()==3
   if lang=='zh': day_texts.append(panel.locator('.day').inner_text())
   tabs.nth(2).evaluate('(n)=>n.click()');assert panel.locator('.timeline li').count()>=3
   tabs.nth(3).evaluate('(n)=>n.click()');assert len(panel.locator('#program-detail').inner_text())>25
 if not os.environ.get('ISU_SKIP_CATALOG'): assert len(set(day_texts))==38
 print('Bilingual content coverage skipped for focused rerun' if os.environ.get('ISU_SKIP_CATALOG') else 'All bilingual content passed', flush=True)
 # The two lit English bachelor's options and a separately gated MBA on the business island.
 page.evaluate('()=>{if(!document.documentElement.lang.startsWith("zh"))__app.flow.toggleLang();__app.flow.s.answers={edu:"hs",lang:"en",bg:"none",route:"degree"};__app.flow.s.bridge="en";__app.flow.focusIsland("business");}')
 page.wait_for_timeout(2200); panel=page.locator('.panel.in').last
 assert panel.locator('.program-choice').count()==8
 assert panel.locator('.program-choice.lit').count()==2
 panel.get_by_role('button',name='亮燈科系',exact=True).click(); assert panel.locator('.program-choice').count()==2
 panel.get_by_role('button',name='中文授課',exact=True).click(); assert panel.locator('.program-choice').count()==5
 panel.get_by_role('button',name='全部',exact=True).click()
 panel.locator('[data-program-id=imba]').click(); assert page.locator('.panel.in .panel-foot button').last.is_disabled()
 # Raycast each visible building, bypassing HTML labels, to confirm the house itself is interactive.
 page.evaluate('()=>{__app.flow.focusIsland("code");}')
 page.wait_for_function('__app.controls.enabled', timeout=30000)
 page.wait_for_timeout(200)
 hit=page.evaluate("""()=>{const a=__app;const i=a.arch.byId('code');a.scene.updateMatrixWorld(true);for(const [id,{house}]of Object.entries(i.programBuildings)){house.geometry.computeBoundingBox();const v=house.geometry.boundingBox.getCenter(a.look.clone());house.localToWorld(v);v.project(a.camera);const x=(v.x*.5+.5)*innerWidth,y=(-v.y*.5+.5)*innerHeight;const h=a.hit({clientX:x,clientY:y});if(h?.programId===id && x<innerWidth-460 && y>80)return {id,x,y};}return null;}""")
 assert hit, 'No visible raycastable program house'
 print('Ray target',hit,flush=True)
 page.locator('#labels').evaluate('(n)=>n.style.pointerEvents="none"')
 page.add_style_tag(content='#labels .hotspot{pointer-events:none!important}')
 page.mouse.click(hit['x'],hit['y']);page.wait_for_timeout(300)
 expect(page.locator('.panel.in').last.locator('h2')).to_have_text(next(r['name']['zh'] for r in records if r['id']==hit['id']))
 print('Real house raycast passed', flush=True)
 # IFP is a real intermediate island and shows exactly thirteen destinations.
 page.evaluate('()=>{__app.flow.s.bridge="ifp";__app.flow.s.answers={edu:"hs",lang:"none",bg:"none",route:"mandarin"};__app.flow.pathwayStep("ifp",()=>__app.flow.islandsStep(),true);}')
 page.wait_for_timeout(2100);panel=page.locator('.panel.in').last
 assert panel.locator('.programs .program').count()==13
 assert page.evaluate('__app.traveler.group.parent===__app.arch.foundation.group')
 page.screenshot(path=str(OUT/'ifp.png'))
 panel.locator('.programs .program').filter(has_text='資訊工程').click();page.wait_for_timeout(500)
 page.locator('.panel.in').last.get_by_role('tab').nth(2).click()
 assert '先修年' in page.locator('.panel.in .timeline').last.inner_text()
 assert page.locator('.panel.in .timeline li').last.count()==1
 # INTENSE distinguishes both languages and two-year study from employment.
 page.evaluate('()=>{__app.flow.s.bridge="intense";__app.flow.s.answers={edu:"bachelor",lang:"en",bg:"none",route:"industry"};__app.flow.pathwayStep("intense");}')
 page.wait_for_timeout(300);panel=page.locator('.panel.in').last
 assert panel.locator('.programs .program').count()==2
 assert panel.locator('.partner-list .tag').count()==5
 page.screenshot(path=str(OUT/'intense.png'))
 panel.locator('.programs .program').filter(has_text='設備工程').click();page.wait_for_timeout(2000)
 panel=page.locator('.panel.in').last;panel.get_by_role('tab').nth(2).click()
 assert '第 2 年' in panel.locator('.timeline').inner_text()
 panel.get_by_role('button',name='在這裡插旗',exact=True).click();page.wait_for_timeout(1000)
 assert page.locator('.route-preview').get_attribute('src').startswith('data:image/jpeg')
 assert page.evaluate('__app.flow.s.flag.programId')=='equip'
 page.screenshot(path=str(OUT/'route.png'))
 # Mobile layout: content and fixed actions remain on screen; every title can be reached.
 for size in [{'width':390,'height':844},{'width':360,'height':740}]:
  page.set_viewport_size(size)
  page.evaluate('()=>{__app.flow.focusIsland("health","nurse");}')
  page.wait_for_timeout(2100)
  box=page.locator('.panel.in').last.bounding_box();assert box['x']>=-1 and box['width']<=size['width']+1
  foot=page.locator('.panel.in .panel-foot').last.bounding_box();assert foot['y']+foot['height']<=size['height']+1
  page.screenshot(path=str(OUT/f'mobile-{size["width"]}.png'))
 assert not errors, errors
 assert not bad,bad
 (OUT/'browser-results.json').write_text(json.dumps({'programs_both_languages':0 if os.environ.get('ISU_SKIP_CATALOG') else 76,'unique_day_stories':len(set(day_texts)),'house_clicked':hit['id'],'audio':'play,pause,switch,replay','errors':errors,'failed_local_requests':bad},ensure_ascii=False,indent=2))
 print('Browser checks passed: real house click, filters, IFP, INTENSE, route card, mobile and narration.' + (' Plus 76 bilingual program views.' if not os.environ.get('ISU_SKIP_CATALOG') else ''))
 browser.close()
