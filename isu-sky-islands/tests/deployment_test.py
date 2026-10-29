"""Smoke-test the real GitHub Pages subpath, locally or after publication."""
import argparse
from urllib.parse import urljoin,urlsplit
from playwright.sync_api import sync_playwright,expect
parser=argparse.ArgumentParser()
parser.add_argument('--game-url',required=True)
args=parser.parse_args()
game=args.game_url.rstrip('/')+'/'
portal=urljoin(game,'../')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 page=browser.new_page(viewport={'width':1366,'height':900},locale='zh-TW')
 errors=[];failed=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('response',lambda r:failed.append({'status':r.status,'path':urlsplit(r.url).path}) if r.status>=400 and urlsplit(r.url).netloc==urlsplit(game).netloc else None)
 page.goto(portal,wait_until='networkidle')
 card=page.locator('.nav-grid .card').first
 assert card.get_attribute('href')=='isu-sky-islands/index.html'
 card.click();page.wait_for_load_state('networkidle')
 page.wait_for_function('window.__app?.flow && document.querySelector(".title")')
 page.wait_for_timeout(1000)
 expect(page.locator('.title h1')).to_be_visible()
 page.locator('.voice-toggle').click()
 page.wait_for_function('!__app.flow.narrator.audio.paused && __app.flow.narrator.audio.currentTime>0')
 assert urlsplit(page.evaluate('__app.flow.narrator.audio.src')).path.startswith(urlsplit(game).path+'assets/narration/')
 page.locator('.voice-toggle').click();page.wait_for_function('__app.flow.narrator.audio.paused')
 page.get_by_role('button',name='略過',exact=True).click()
 expect(page.locator('.panel.in h2')).to_have_text('十年後的你，是哪一種人？')
 assert page.locator('.lantern-dot').count()==0
 page.evaluate('async()=>{const f=__app.flow;f.s.country="VN";f.s.bridge="en";f.s.life="unsure";f.s.answers={edu:"hs",lang:"en",bg:"none",route:"degree"};await f.focusIsland("business");}')
 assert page.locator('.panel.in .program-choice.lit').count()==2
 page.locator('.panel.in [data-program-id=iciba]').click()
 expect(page.locator('.panel.in h2')).to_have_text('國際企業經營英語學士學位學程')
 page.locator('.panel.in').get_by_role('tab').nth(1).click()
 assert page.locator('.panel.in .moment').count()==3
 page.get_by_role('button',name='Language',exact=True).click()
 assert page.locator('html').get_attribute('lang')=='en'
 page.set_viewport_size({'width':390,'height':844})
 page.wait_for_timeout(400)
 box=page.locator('.home-button').bounding_box()
 assert box['x']>=0 and box['x']+box['width']<=390
 with page.expect_navigation(wait_until='networkidle'):
  page.locator('.home-button').click()
 page.wait_for_function('window.__app?.flow && document.querySelector(".title")')
 assert page.evaluate('__app.flow.s.country===null && __app.flow.s.bridge===null && __app.flow.narrator.overviewPlayed.size===0')
 expect(page.locator('.title h1')).to_have_text('Islands in the Sky')
 assert not errors,errors
 assert not failed,failed
 print({'url':game,'portal_entry':True,'subpath_assets':True,'narration_playback':True,'bilingual':True,'program_selection':True,'mobile_home_reset':True,'errors':errors,'failed_requests':failed})
 browser.close()
