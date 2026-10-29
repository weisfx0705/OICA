"""All program content remains readable in both languages before admission screening."""
from playwright.sync_api import sync_playwright,expect
with sync_playwright() as p:
 b=p.chromium.launch(headless=True)
 page=b.new_page(viewport={'width':1366,'height':900},locale='zh-TW')
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8000');page.wait_for_load_state('networkidle');page.wait_for_timeout(1000)
 page.evaluate('()=>{const a=__app,f=a.flow;f.titleEl.remove();a.updaters=[];a.renderer.setAnimationLoop(null);f.narrator.pause();f.s.life="unsure";a.setStage("campus");}')
 page.add_style_tag(content='*,*::before,*::after{transition:none!important;animation-duration:.01ms!important}')
 rows=page.evaluate('async()=>{const {ISLANDS}=await import("./js/content.js");return ISLANDS.flatMap(i=>i.programs.map(p=>({island:i.id,id:p.id,name:p.name,url:p.url})));}')
 days=[]
 for lang in ['zh','en']:
  page.evaluate('(lang)=>{if(document.documentElement.lang.startsWith("zh")!==(lang==="zh"))__app.flow.toggleLang();}',lang)
  for row in rows:
   page.evaluate('(row)=>{__app.flow.focusIsland(row.island,row.id);}',row)
   panel=page.locator('.panel.in').last;expect(panel.locator('h2')).to_have_text(row['name'][lang])
   assert panel.locator('a').first.get_attribute('href')==row['url']
   tabs=panel.get_by_role('tab');assert tabs.count()==4
   tabs.nth(1).evaluate('(n)=>n.click()');assert panel.locator('.moment').count()==3
   if lang=='zh':days.append(panel.locator('.day').inner_text())
   tabs.nth(2).evaluate('(n)=>n.click()');assert panel.locator('.timeline li').count()>=3
   tabs.nth(3).evaluate('(n)=>n.click()');assert panel.locator('.admission-status.preview').count()==1
   assert not panel.locator('.panel-foot').get_by_role('button',name='確認科系，定錨',exact=True).count()
 assert len(set(days))==38
 assert not errors,errors
 print({'bilingual_preview_views':76,'unique_day_scenarios':38,'admission_required_before_anchor':True,'errors':errors})
 b.close()
