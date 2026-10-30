"""Walk every admission route from an island preview to the anchor button and report where it gets stuck."""
import sys
from playwright.sync_api import sync_playwright
CASES=[ # island, program, route, edu, lang, bg, country, can anchor
 ('maker','intense-mae','industry','bachelor','zh','none','VN',True),
 ('chip','equip','industry','bachelor','en','none','VN',True),
 ('maker','intense-mae','industry','bachelor','en','none','VN',True,'chip-equip'), # sent on to the recommended English program
 ('maker','intense-mae','degree','bachelor','zh','none','VN',False),
 ('chip','che','mandarin','hs','none','none','VN',True),
 ('code','ipai','degree','hs','en','none','VN',True),
 ('business','ba','degree','hs','zh','none','VN',True),
 ('business','ba','degree','hs','zh','oc','MY',True),
 ('business','imba','degree','bachelor','en','none','US',True),
]
results=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True)
 for case in CASES:
  isl,prog,route,edu,lang,bg,country,expect=case[:8];land=case[8] if len(case)>8 else f'{isl}-{prog}'
  pg=b.new_page(viewport={'width':1440,'height':1000},locale='zh-TW');pg.add_init_script('localStorage.setItem("isu-lite","true")')
  errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('http://127.0.0.1:8000');pg.wait_for_load_state('networkidle');pg.wait_for_timeout(800)
  pg.evaluate('()=>{const a=__app,f=a.flow;f.titleEl.remove();a.updaters=[];f.narrator.pause();a.setStage("campus");a.arch.group.visible=true;f.s.life="stay";f.interestStep();}')
  pg.wait_for_timeout(500)
  pg.locator(f'[data-island-id={isl}]').click();pg.wait_for_timeout(600)
  if pg.locator(f'.panel.in [data-program-id="{prog}"]').count()==0:
    raise AssertionError((case,'program not on island'))
  pg.locator(f'.panel.in [data-program-id="{prog}"]').click();pg.wait_for_timeout(300)
  pg.locator('.panel.in .panel-foot button').last.click();pg.wait_for_selector('.panel.in[data-key=bridge-questions]')
  panel=pg.locator('.panel.in')
  panel.locator(f'[data-country={country}]').evaluate('n=>n.click()')
  for q,v in [('route',route),('edu',edu),('lang',lang),('bg',bg),('exp','none')]: panel.locator(f'[data-question={q}] [data-answer={v}]').evaluate('n=>n.click()')
  pressed=pg.evaluate('()=>[...document.querySelectorAll(".panel.in [aria-pressed=true]")].map(n=>n.dataset.answer||n.dataset.country)')
  btn=panel.locator('.panel-foot .btn').last
  assert not btn.is_disabled(),(case,pressed)
  btn.click();pg.wait_for_timeout(2500)
  key=pg.evaluate('document.querySelector(".panel.in")?.dataset.key')
  if key and key.startswith('bridge-result'):
    pg.locator('.panel.in .panel-foot button').last.click();pg.wait_for_timeout(2500)
  try: pg.wait_for_function('document.querySelector(".panel.in")?.dataset.key?.startsWith("island-")||document.querySelector(".panel.in")?.dataset.key==="islands"',timeout=15000)
  except Exception: pass
  key=pg.evaluate('document.querySelector(".panel.in")?.dataset.key')
  st=pg.evaluate('()=>({bridge:__app.flow.s.bridge,answers:__app.flow.s.answers})')
  flag=pg.get_by_role('button',name='確認科系，定錨',exact=True)
  can=bool(flag.count() and not flag.is_disabled())
  adjust=pg.get_by_role('button',name='回到起點調整條件',exact=True).count()
  assert key==f'island-{land}',(case,key)
  assert can==expect,(case,can)
  assert can or adjust==1,(case,'no way forward')
  assert pg.locator('.panel.in .crumbs button').filter(has_text='我的起點').count()==1
  assert not errs,errs
  results.append(case[:2]+(can,))
  pg.close()
 b.close()
print({'routes':len(results),'anchorable':sum(r[2] for r in results),'stuck':0})
