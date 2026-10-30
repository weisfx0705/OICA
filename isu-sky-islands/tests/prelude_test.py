"""Verify the expanded bilingual prelude against the running local server."""
import json,re,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
OUT=Path('/tmp/isu-islands-round2');OUT.mkdir(exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 page=browser.new_page(viewport={'width':1440,'height':1000},locale='zh-TW')
 errors=[];failed=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('response',lambda r:failed.append((r.status,r.url)) if r.status>=400 and '127.0.0.1' in r.url else None)
 page.goto('http://127.0.0.1:8000');page.wait_for_load_state('networkidle');page.wait_for_timeout(1300)
 page.get_by_role('button',name='開始旅程',exact=True).click();page.wait_for_timeout(1500)
 page.locator('.panel.in .chip').filter(has_text='越南').click()
 page.locator('.panel.in .panel-foot button').last.click()
 page.wait_for_function('__app.globe.flightProgress>0.06 && __app.globe.flightProgress<0.95',timeout=15000)
 assert page.evaluate('__app.globe.aircraft.visible && __app.globe.rider===__app.globe.aircraft && !__app.traveler.group.visible')
 page.screenshot(path=str(OUT/'airplane.png'))
 page.wait_for_function('__app.stageName==="taiwan" && document.querySelector(".panel.in")?.dataset.key.startsWith("taiwan")',timeout=20000)
 assert page.evaluate('__app.traveler.group.visible')
 page.evaluate('__app.flow.narrator.pause()')
 page.add_style_tag(content='*,*::before,*::after{transition:none!important;animation-duration:.01ms!important}')
 records=page.evaluate("async()=>{const c=await import('./js/content.js');return {taiwan:c.TAIWAN.keywords,kaohsiung:c.KAOHSIUNG_STAGE.spots,campus:c.CAMPUS.spots};}")
 assert [len(records[k]) for k in ['taiwan','kaohsiung','campus']]==[6,6,7]
 views=0
 for lang in ['zh','en']:
  page.evaluate('(lang)=>{if(document.documentElement.lang.startsWith("zh")!==(lang==="zh"))__app.flow.toggleLang();}',lang)
  for chapter,rows in records.items():
   page.evaluate('(kind)=>{const a=__app,f=a.flow;if(kind==="taiwan"){f.toTaiwan();f.taiwanStep();}else if(kind==="kaohsiung"){a.setStage("kaohsiung");f.kaohsiungStep();}else{f.toCampus(false);f.campusStep();}}',chapter)
   for row in rows:
    print(chapter,lang,row['id'],flush=True)
    button=page.locator('.panel.in').last.locator('.chip').filter(has_text=row['title'][lang]).first
    button.evaluate('(n)=>n.click()')
    panel=page.locator('.panel.in').last
    expect(panel.locator('h2')).to_have_text(row['title'][lang])
    assert panel.locator('.chapter-gallery img').count()>=1,(chapter,lang,row['id'],panel.inner_html()[:1200],errors)
    if row['id']=='free':assert panel.locator('.history-timeline li').count()==5
    if row['id']=='transit':
     assert 'T-Pass' in panel.inner_text();assert '399' in panel.inner_text();assert not re.search('MeN.?GO',panel.inner_text(),re.I)
    if row['id']=='group': assert panel.locator('.group-sectors>div').count()==4
    panel.locator('.chapter-gallery button').first.evaluate('(n)=>n.click()')
    assert page.locator('dialog[open]').count()==1
    page.keyboard.press('Escape');assert page.locator('dialog[open]').count()==0
    views+=1
 print('Bilingual chapter views passed:',views,flush=True)
 assert views==38
 assert page.evaluate('Object.keys(__app.khh.routes).sort().join(",")')=='ferry,lightRail,orange,red'
 assert page.evaluate('!!__app.tw.routes.hsr && !!__app.tw.routes.tra')
 # Inspect colour restoration in both directions, without making grey buildings unclickable.
 page.evaluate('()=>{const f=__app.flow;f.s.country="VN";f.s.bridge="en";f.s.answers={edu:"hs",lang:"en",bg:"none",exp:"none",route:"degree",goal:"bachelor"};f.s.life="unsure";__app.arch.group.visible=true;f.focusIsland("business");}')
 page.wait_for_timeout(2200)
 panel=page.locator('.panel.in').last
 assert panel.locator('.program-choice.lit').count()==2 and panel.locator('.program-choice.muted').count()==6
 assert page.evaluate('()=>{const a=__app.arch.byId("business").programBuildings.ba.house.geometry.attributes.color.array;for(let i=0;i<a.length;i+=3)if(Math.abs(a[i]-a[i+1])>1e-6||Math.abs(a[i]-a[i+2])>1e-6)return false;return true;}')
 panel.locator('[data-program-id=ba]').click();expect(page.locator('.panel.in').last.locator('h2')).to_contain_text('Business Administration' if not page.evaluate('document.documentElement.lang.startsWith("zh")') else '企業管理學系')
 page.evaluate('()=>{__app.flow.s.bridge="zh";__app.flow.s.answers.lang="zh";__app.flow.focusIsland("business");}')
 page.wait_for_timeout(2100)
 assert page.evaluate('()=>{const a=__app.arch.byId("business").programBuildings.ba.house.geometry.attributes.color.array;return Array.from(a).some((_,i)=>i%3===0&&Math.abs(a[i]-a[i+1])>1e-5);}')
 # Mobile layout and image viewer at the narrow viewport.
 page.set_viewport_size({'width':390,'height':844})
 page.evaluate('()=>{if(!document.documentElement.lang.startsWith("zh"))__app.flow.toggleLang();__app.setStage("kaohsiung");__app.flow.kaohsiungStep();}')
 page.wait_for_timeout(2100)
 page.locator('.panel.in .chip').filter(has_text='T-Pass').click();page.wait_for_timeout(500)
 box=page.locator('.panel.in').last.bounding_box();assert box['x']>=-1 and box['width']<=391
 foot=page.locator('.panel.in .panel-foot').last.bounding_box();assert foot['y']+foot['height']<=845
 page.screenshot(path=str(OUT/'mobile-transit.png'))
 assert not errors,errors
 assert not failed,failed
 (OUT/'prelude-results.json').write_text(json.dumps({'bilingual_chapters':views,'aircraft_flight':True,'transport_networks':True,'photo_viewer':True,'grayscale_restores_colour':True,'mobile':True,'errors':errors,'failed_requests':failed},indent=2))
 print('Prelude passed: airplane, 38 bilingual chapter views, rail and ferry routes, photo viewer, colour restoration, mobile, T-Pass naming.',flush=True)
 browser.close()
