"""Smoke-test the published subpath and the life -> preview -> bridge -> anchor flow."""
import argparse
from urllib.parse import urljoin,urlsplit
from playwright.sync_api import sync_playwright,expect
parser=argparse.ArgumentParser();parser.add_argument('--game-url',required=True);args=parser.parse_args()
game=args.game_url.rstrip('/')+'/';portal=urljoin(game,'../')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 page=browser.new_page(viewport={'width':1366,'height':900},locale='zh-TW')
 page.add_init_script('localStorage.setItem("isu-lite","true")')
 errors=[];failed=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('response',lambda r:failed.append({'status':r.status,'path':urlsplit(r.url).path}) if r.status>=400 and urlsplit(r.url).netloc==urlsplit(game).netloc else None)
 page.goto(portal,wait_until='networkidle');card=page.locator('.nav-grid .card').first
 assert card.get_attribute('href')=='isu-sky-islands/index.html';card.click();page.wait_for_load_state('networkidle')
 page.wait_for_function('window.__app?.flow && document.querySelector(".title")');page.wait_for_timeout(900)
 page.locator('.voice-toggle').click();page.wait_for_function('!__app.flow.narrator.audio.paused&&__app.flow.narrator.audio.currentTime>0')
 assert urlsplit(page.evaluate('__app.flow.narrator.audio.src')).path.startswith(urlsplit(game).path+'assets/narration/')
 page.locator('.voice-toggle').click();page.wait_for_function('__app.flow.narrator.audio.paused')
 page.get_by_role('button',name='略過',exact=True).click();page.wait_for_selector('.panel.in[data-key=life]')
 page.locator('[data-life-id=home]').click();page.locator('.panel.in .panel-foot button').last.click()
 page.locator('.panel.in [data-map-filter=ifp]').click();page.wait_for_function('__app.controls.enabled')
 assert page.evaluate('__app.arch.connectionPreview.programIds.length')==13
 assert page.evaluate('__app.flow.s.bridge') is None
 page.locator('.panel.in [data-map-filter=all]').click();
 page.locator('[data-island-id=code]').click();page.wait_for_function('__app.controls.enabled')
 assert page.locator('.panel.in .program-choice.preview').count()==3
 assert page.evaluate('__app.flow.s.bridge===null')
 page.locator('.panel.in [data-program-id=ipai]').click();page.locator('.panel.in .panel-foot button').last.click()
 page.wait_for_selector('.panel.in[data-key=bridge-questions]');panel=page.locator('.panel.in');panel.locator('[data-country=VN]').click()
 for question,value in [('route','degree'),('edu','hs'),('lang','en'),('bg','none')]:panel.locator(f'[data-question={question}] [data-answer={value}]').click()
 panel.locator('.panel-foot button').last.click();expect(page.locator('.panel.in .bn')).to_have_text('英文橋')
 assert page.evaluate('__app.flow.s.bridge===null')
 page.locator('.panel.in .panel-foot button').last.click();page.wait_for_function('__app.controls.enabled')
 expect(page.locator('.panel.in h2')).to_have_text('智慧科技英語學士學位學程')
 assert page.evaluate('__app.traveler.group.name')=='cloudlet-mascot'
 page.get_by_role('button',name='確認科系，定錨',exact=True).click()
 page.wait_for_function('document.querySelector(".route-preview")?.src.startsWith("data:image/jpeg")')
 assert page.evaluate('__app.arch.anchoredChoice.programId')=='ipai'
 page.get_by_role('button',name='Language',exact=True).click();assert page.locator('html').get_attribute('lang')=='en'
 expect(page.locator('.panel.in .journey-summary h3')).to_have_text('Your new starting point')
 expect(page.locator('.panel.in .summary-life')).to_contain_text('Start something back home')
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(300)
 box=page.locator('.home-button').bounding_box();assert box['x']>=0 and box['x']+box['width']<=390
 with page.expect_navigation(wait_until='networkidle'):page.locator('.home-button').click()
 page.wait_for_function('window.__app?.flow&&document.querySelector(".title")')
 assert page.evaluate('__app.flow.s.country===null&&__app.flow.s.bridge===null&&__app.flow.s.likes.size===0')
 expect(page.locator('.title h1')).to_have_text('Islands in the Sky')
 assert not errors,errors
 assert not failed,failed
 print({'url':game,'portal_entry':True,'subpath_assets':True,'narration':True,'preview_before_bridge':True,'bridge_confirmation':True,'mascot_anchor':True,'bilingual_mobile_home':True,'errors':errors,'failed_requests':failed})
 browser.close()
