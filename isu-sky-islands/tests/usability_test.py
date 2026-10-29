"""Topic hearts, isolated Cijin, map connections and one-time special-route selection."""
from pathlib import Path
import argparse
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright,expect
parser=argparse.ArgumentParser();parser.add_argument('--game-url',default='http://127.0.0.1:8000/');args=parser.parse_args()
OUT=Path('/tmp/isu-islands-round5');OUT.mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(headless=True)
 page=b.new_page(viewport={'width':1440,'height':1000},locale='zh-TW')
 page.add_init_script('localStorage.setItem("isu-lite","true")')
 errors=[];bad=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('response',lambda r:bad.append(r.url) if r.status>=400 and urlsplit(r.url).netloc==urlsplit(args.game_url).netloc else None)
 page.goto(args.game_url);page.wait_for_load_state('networkidle');page.wait_for_timeout(1000)
 for group,enter,key in [('taiwan','f.toTaiwan();f.taiwanStep();','free'),('kaohsiung','a.setStage("kaohsiung");f.kaohsiungStep();','mountains'),('campus','f.toCampus(false);f.campusStep();','metaverse')]:
  page.evaluate('()=>{const a=__app,f=a.flow;f.titleEl?.remove();a.updaters=[];f.narrator.pause();'+enter+'}')
  panel=page.locator('.panel.in').last
  heart=panel.locator(f'.topic-heart[data-like-key="{group}:{key}"]')
  heart.click();expect(heart).to_have_attribute('aria-pressed','true')
  panel.locator(f'.topic-choice[data-topic-id={key}] .topic-open').click()
  top=page.locator('.panel.in .chapter-like-row .heart-button');expect(top).to_have_attribute('aria-pressed','true')
  top.click();expect(page.locator(f'.panel.in .topic-heart[data-like-key="{group}:{key}"]')).to_have_attribute('aria-pressed','false')
  top.click();page.locator('.panel.in .panel-foot button').first.click()
  expect(page.locator(f'.panel.in .topic-choice[data-topic-id={key}]')).to_have_class('topic-choice saved')
 assert page.evaluate('__app.flow.s.likes.size')==3
 assert 'null' not in page.locator('.panel.in .topic-choices').inner_text()
 page.screenshot(path=str(OUT/'saved-topics.png'))
 # The ferry crossing is water, with Cijin separately above the sea.
 sea=page.evaluate('async()=>{const {Raycaster,Vector3}=await import("./vendor/three.module.min.js");const a=__app;a.setStage("kaohsiung");a.scene.updateMatrixWorld(true);const meshes=[];a.khh.group.traverse(o=>{if(o.isMesh)meshes.push(o);});return [[-21,12],[-25,13],[-24,0]].map(([x,z])=>{const origin=a.khh.group.localToWorld(new Vector3(x,30,z));const hit=new Raycaster(origin,new Vector3(0,-1,0)).intersectObjects(meshes,false)[0];return hit?.object.name;});}')
 assert sea==['continuous-harbour-sea']*3,sea
 # Language and IFP filters draw exact program endpoints without choosing admission answers.
 page.evaluate('()=>{const a=__app,f=a.flow;f.s.life="home";a.setStage("campus");a.arch.group.visible=true;f.interestStep();}')
 counts={}
 for value,expected in [('zh',30),('en',7),('ifp',13)]:
  page.locator('.panel.in [data-map-filter='+value+']').click();page.wait_for_function('__app.controls.enabled')
  count=page.evaluate('__app.arch.connectionPreview.programIds.length');counts[value]=count;assert count==expected,(value,count)
  assert page.evaluate('__app.flow.s.bridge') is None
 assert page.evaluate('__app.controls.getPolarAngle()')<.12
 expected_ids=page.evaluate('async()=>{const {ISLANDS}=await import("./js/content.js");return ISLANDS.flatMap(i=>i.programs.filter(p=>p.bridges.includes("ifp")).map(p=>p.id)).sort();}')
 assert sorted(page.evaluate('__app.arch.connectionPreview.programIds'))==expected_ids
 page.screenshot(path=str(OUT/'ifp-overview.png'))
 # An IFP intro selects the intent once; no second route question or repeated selection is needed.
 page.evaluate('__app.flow.s.pendingIsland="code";__app.flow.s.pendingProgram="csie";__app.flow.pathwayStep("ifp",()=>__app.flow.interestStep())')
 assert page.evaluate('__app.arch.connectionPreview.programIds.length')==13
 page.get_by_role('button',name='我要選 IFP',exact=True).click();page.wait_for_selector('.panel.in[data-key=bridge-questions]')
 assert page.locator('.panel.in [data-question=route]').count()==0
 panel=page.locator('.panel.in');panel.locator('[data-country=VN]').click()
 for q,v in [('edu','hs'),('lang','none'),('bg','none')]:panel.locator(f'[data-question={q}] [data-answer={v}]').click()
 panel.locator('.panel-foot button').last.click();page.wait_for_function('__app.flow.s.bridge==="ifp"&&__app.controls.enabled')
 expect(page.locator('.panel.in h2')).to_have_text('資訊工程學系')
 # INTENSE explicitly selects English on its intro, keeps it through the starting-point check,
 # and cannot confirm a complete Chinese-language profile until the user changes it.
 page.evaluate('()=>{const f=__app.flow;f.s.bridge=null;f.s.routeIntent=null;f.s.answers={edu:"bachelor",lang:"zh",bg:"none",route:"degree"};f.s.pendingIsland="chip";f.s.pendingProgram="equip";f.pathwayStep("intense",()=>f.interestStep());}')
 expect(page.locator('.panel.in .programs .program')).to_have_count(1)
 assert '英語' in page.locator('.panel.in .route-requirement').inner_text()
 page.get_by_role('button',name='我可用英語上課，選 INTENSE',exact=True).click();page.wait_for_function('__app.flow.s.bridge==="intense"&&__app.controls.enabled')
 expect(page.locator('.panel.in h2')).to_contain_text('設備工程')
 assert page.evaluate('__app.flow.s.answers.lang')=='en'
 page.evaluate('()=>{const f=__app.flow;f.s.bridge=null;f.s.routeIntent="intense";f.s.answers={edu:"bachelor",lang:"zh",bg:"none",route:"industry"};f.bridgeStep();}')
 page.wait_for_selector('.panel.in[data-key=bridge-questions]');assert page.locator('.panel.in .panel-foot button').last.is_disabled()
 page.locator('.panel.in [data-question=lang] [data-answer=en]').click();assert page.locator('.panel.in .panel-foot button').last.is_enabled()
 page.locator('.panel.in .panel-foot button').last.click();page.wait_for_function('__app.flow.s.bridge==="intense"&&__app.controls.enabled')
 # Life choice is printed even when hearts are present, both on screen and in the image.
 page.evaluate('()=>{window.__lifeCardText=[];const old=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...args){__lifeCardText.push(String(text));return old.call(this,text,...args);};}')
 page.get_by_role('button',name='確認科系，定錨',exact=True).click();page.wait_for_function('document.querySelector(".route-preview")?.src.startsWith("data:image/jpeg")')
 assert '回家鄉創業' in page.locator('.panel.in .summary-life').inner_text()
 assert '回家鄉創業' in page.evaluate('__lifeCardText.join(" ")')
 page.get_by_role('button',name='Language',exact=True).click();expect(page.locator('.panel.in .summary-life')).to_contain_text('Start something back home')
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(300);page.screenshot(path=str(OUT/'mobile-life-summary.png'))
 assert not errors,errors
 assert not bad,bad
 print({'hearts_all_sections':True,'inside_outside_sync':True,'sea_crossing':True,'connections':counts,'birdseye':True,'ifp_chosen_once':True,'intense_english_only':True,'life_on_screen_and_image':True,'bilingual_mobile':True,'errors':errors})
 b.close()
