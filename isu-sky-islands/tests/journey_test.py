"""End-to-end: saved hearts -> life -> island preview -> chosen bridge -> program -> anchor."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
OUT=Path('/tmp/isu-islands-round4');OUT.mkdir(exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 page=browser.new_page(viewport={'width':1440,'height':1000},locale='zh-TW')
 page.add_init_script('localStorage.setItem("isu-lite","true")')
 errors=[];failed=[];api=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('response',lambda r:failed.append((r.status,r.url)) if r.status>=400 and '127.0.0.1' in r.url else None)
 page.on('request',lambda r:api.append(r.url) if 'generativelanguage.googleapis' in r.url or 'api.openai.com' in r.url else None)
 page.goto('http://127.0.0.1:8000');page.wait_for_load_state('networkidle');page.wait_for_timeout(1000)
 page.evaluate('()=>{const a=__app,f=a.flow;f.titleEl.remove();a.updaters=[];f.narrator.pause();f.toTaiwan();f.taiwanStep();}')
 for label in ['民主、自由','從早餐店']:
  page.locator('.panel.in .chip').filter(has_text=label).click();page.locator('.panel.in .chapter-like-row .heart-button').click()
 assert page.evaluate('__app.flow.s.likes.size')==2
 page.locator('.panel.in .chapter-like-row .heart-button').click();assert page.evaluate('__app.flow.s.likes.size')==1
 page.locator('.panel.in .chapter-like-row .heart-button').click()
 page.locator('.panel.in .panel-foot button').last.click();page.wait_for_selector('.panel.in[data-key="khh-overview"]')
 page.locator('.panel.in .chip').filter(has_text='柴山').click();page.locator('.panel.in .chapter-like-row .heart-button').click()
 page.locator('.panel.in .panel-foot button').last.click();page.wait_for_selector('.panel.in[data-key="campus-overview"]')
 page.locator('.panel.in .chip').filter(has_text='元宇宙').click();page.locator('.panel.in .chapter-like-row .heart-button').click()
 assert page.evaluate('__app.flow.s.likes.size')==4
 page.screenshot(path=str(OUT/'heart.png'))
 page.locator('.panel.in .panel-foot button').last.click();page.wait_for_selector('.panel.in[data-key=life]')
 assert '十年' not in page.locator('.panel.in').inner_text()
 page.locator('[data-life-id=unsure]').click();page.locator('.panel.in .panel-foot button').last.click()
 expect(page.locator('.panel.in h2')).to_have_text('想探索哪一種學習？')
 page.locator('[data-island-id=code]').click();page.wait_for_function('__app.controls.enabled')
 assert page.evaluate('__app.flow.s.bridge===null && __app.traveler.group.parent===__app.campus.group')
 assert page.locator('.panel.in .program-choice.preview').count()==3
 assert page.locator('.panel.in .program-choice.muted').count()==0
 page.locator('.panel.in [data-program-id=ipai]').click()
 for index in [1,2,3]:page.locator('.panel.in').get_by_role('tab').nth(index).click()
 assert page.locator('.panel.in .journey-summary li').count()==3
 assert page.locator('.panel.in .panel-foot button').last.inner_text().startswith('認識起點')
 page.locator('.panel.in .panel-foot button').last.click();page.wait_for_selector('.panel.in[data-key=bridge-questions]')
 for text in ['日間學士班','碩士','中文','英文','IFP','INTENSE']:assert text in page.locator('.panel.in').inner_text()
 def answer(edu,lang,route):
  panel=page.locator('.panel.in');panel.locator('[data-country=VN]').click()
  for question,value in [('route',route),('edu',edu),('lang',lang),('bg','none')]:panel.locator(f'[data-question={question}] [data-answer={value}]').click()
  panel.locator('.panel-foot .btn').last.click()
 answer('hs','en','degree')
 expect(page.locator('.panel.in .bn')).to_have_text('英文橋');assert page.evaluate('__app.flow.s.bridge===null')
 page.locator('.panel.in .panel-foot button').last.click();page.wait_for_function('__app.controls.enabled')
 expect(page.locator('.panel.in h2')).to_have_text('智慧科技英語學士學位學程')
 assert page.evaluate('__app.flow.s.bridge==="en" && __app.traveler.group.parent===__app.arch.byId("code").group')
 assert page.evaluate('__app.traveler.group.name')=='cloudlet-mascot'
 page.evaluate('()=>{window.__cardText=[];const old=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...rest){__cardText.push(String(text));return old.call(this,text,...rest);};}')
 page.get_by_role('button',name='確認科系，定錨',exact=True).click()
 page.wait_for_function('document.querySelector(".route-preview")?.src.startsWith("data:image/jpeg")')
 summary=page.locator('.panel.in .journey-summary').first
 assert summary.locator('li').count()==3
 for text in ['民主與多元','台式早餐','柴山與西子灣','元宇宙與影像創作','程式島','智慧科技英語']:assert text in summary.inner_text()
 drawn=page.evaluate('__cardText.join(" ")')
 assert '民主與多元' in drawn and '柴山與西子灣' in drawn and '元宇宙與影像創作' in drawn
 assert page.evaluate('__app.arch.anchoredChoice.programId')=='ipai'
 page.wait_for_timeout(2000);page.screenshot(path=str(OUT/'anchored-hearts.png'))
 page.get_by_role('button',name='Language',exact=True).click()
 assert 'Democracy' in page.locator('.panel.in .journey-summary').first.inner_text()
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(400);page.screenshot(path=str(OUT/'mobile-summary.png'))
 with page.expect_navigation(wait_until='networkidle'):page.locator('.home-button').click()
 page.wait_for_function('window.__app?.flow && document.querySelector(".title")')
 assert page.evaluate('__app.flow.s.likes.size===0 && __app.flow.s.bridge===null')
 # IFP returns from its Mandarin stop to the originally previewed degree.
 page.evaluate('()=>{const a=__app,f=a.flow;f.titleEl.remove();a.updaters=[];f.narrator.pause();f.s.life="unsure";a.setStage("campus");f.focusIsland("maker","mae");}')
 page.locator('.panel.in .panel-foot button').last.click();page.wait_for_selector('.panel.in[data-key=bridge-questions]')
 answer('hs','none','mandarin');page.locator('.panel.in .panel-foot button').last.click()
 page.wait_for_selector('.panel.in[data-key=pathway-ifp]');assert page.evaluate('__app.traveler.group.parent===__app.arch.foundation.group')
 page.locator('.panel.in .panel-foot button').last.click();page.wait_for_function('__app.controls.enabled')
 assert page.evaluate('__app.flow.s.bridge==="ifp" && __app.traveler.group.parent===__app.arch.byId("maker").group')
 page.locator('.panel.in').get_by_role('tab').nth(2).click();assert page.locator('.panel.in .timeline li').count()==5
 # A graduate can explore the industry route; the selected English equipment program is preserved.
 page.evaluate('()=>{const f=__app.flow;f.s.bridge=null;f.s.answers={};f.focusIsland("chip","equip");}')
 page.locator('.panel.in .panel-foot button').last.click();page.wait_for_selector('.panel.in[data-key=bridge-questions]')
 answer('bachelor','en','industry');page.locator('.panel.in .panel-foot button').last.click()
 page.wait_for_selector('.panel.in[data-key=pathway-intense]');page.locator('.panel.in .panel-foot button').last.click();page.wait_for_function('__app.controls.enabled')
 assert page.evaluate('__app.flow.s.bridge==="intense" && __app.flow.s.programSelections.chip==="equip"')
 page.locator('.panel.in').get_by_role('tab').nth(2).click();assert page.locator('.panel.in .timeline li').count()==3
 assert not errors,errors
 assert not failed,failed
 assert not api,api
 result={'hearts_preserved_and_reversible':True,'summary_and_image_include_likes':True,'no_invented_likes_after_reset':True,'preview_before_bridge':True,'bridge_chosen_explicitly':True,'ifp_and_intense':True,'mascot':True,'program_anchor':True,'bilingual_mobile':True,'no_api_requests':True,'errors':errors}
 (OUT/'journey-results.json').write_text(json.dumps(result,indent=2));print(result)
 browser.close()
