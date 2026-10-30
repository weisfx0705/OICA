import assert from 'node:assert/strict';
import { ISLANDS, BRIDGES } from '../js/content.js';
import { PROGRAM_PROFILES } from '../js/program-profiles.js';
import { resolveBridge, programStatus, programJourney, routeEligible, isMainland, studyPath, routeBlockers, goalBlockers, degreesOf, levelLabel } from '../js/logic.js';
const programs = ISLANDS.flatMap(i => i.programs);
assert.equal(programs.length, 38);
assert.equal(new Set(programs.map(p => p.id)).size, 38);
assert.equal(programs.filter(p => p.bridges.includes('ifp')).length, 13);
assert.equal(programs.filter(p => p.bridges.includes('en') && !p.level).length, 5);
// 2026–27 prospectuses: English-taught Equipment Engineering and Chinese-taught Mechanical & Automation
assert.equal(programs.filter(p => p.bridges.includes('intense')).length, 2);
for (const p of programs) {
 const profile = PROGRAM_PROFILES[p.id]; assert.ok(profile, p.id);
 for (const lang of ['zh','en']) {
  for (const key of ['intro','fit','future']) assert.ok(profile[key][lang]?.trim(), `${p.id}.${key}.${lang}`);
  assert.equal(profile.day.length, 3); assert.equal(profile.skills.length, 4);
  for (const item of [...profile.day, ...profile.skills]) assert.ok(item[lang]?.trim());
 }
 assert.match(p.url, /^https:\/\/[^/]+\.isu\.edu\.tw\//);
 for (const bridge of p.bridges) assert.ok(BRIDGES[bridge]);
 assert.ok(programJourney(p, p.bridges[0]).every(s=>s.title.zh && s.title.en && s.body.zh && s.body.en));
}
const state = (lang, edu='hs', bridge=lang, exp='none', country='VN', bg='none') => ({bridge, country, answers:{lang, edu, bg, exp, route:'degree'}});
const byId=id=>programs.find(p=>p.id===id);
assert.equal(routeEligible('intense',state('zh','bachelor','intense')),true);
assert.equal(programStatus(byId('intense-mae'),state('zh','bachelor','intense')).ready,true);
assert.equal(programStatus(byId('equip'),state('zh','bachelor','intense')).ready,false);
assert.equal(programStatus(byId('csie'),state('en')).ready,false);
assert.equal(programStatus(byId('ipai'),state('en')).ready,true);
assert.equal(programStatus(byId('imba'),state('en')).ready,false);
assert.equal(programStatus(byId('imba'),state('en','bachelor')).ready,true);
assert.equal(programStatus(byId('csie'),state('none','hs','ifp')).ready,true);
assert.equal(programStatus(byId('filmtv'),state('none','hs','ifp')).ready,false);
assert.equal(programJourney(byId('csie'),'ifp').length,5);
assert.equal(programJourney(byId('equip'),'intense').length,3);
assert.equal(programJourney(byId('scm'),'zh').length,5);
// the learning card keeps the whole road: IFP comes before the degree
assert.deepEqual(studyPath(byId('che'),'ifp').map(s=>s.kind),['ifp','program']);
assert.deepEqual(studyPath(byId('che'),'zh').map(s=>s.kind),['program']);
assert.deepEqual(studyPath(byId('intense-mae'),'intense').map(s=>s.kind),['intense','program']);
// a high-school answer rules INTENSE out as soon as it is given, before the other answers
assert.deepEqual(routeBlockers('intense',{answers:{edu:'hs'}}).map(b=>b.key),['edu']);
assert.deepEqual(routeBlockers('intense',{answers:{edu:'bachelor',lang:'zh'},country:'VN'}),[]);
assert.deepEqual(routeBlockers('intense',{answers:{edu:'bachelor',lang:'none'},country:'US'}).map(b=>b.key),['lang','country']);
assert.deepEqual(routeBlockers('ifp',{answers:{exp:'tw'}}).map(b=>b.key),['exp']);
{const answers={edu:'hs',lang:'zh',bg:'none',exp:'none',route:'industry'};const r=resolveBridge(answers,'VN');assert.notEqual(r.primary,'intense');assert.ok(!r.alts.includes('intense'));
 assert.ok(!byId('intense-mae')||!programStatus(byId('intense-mae'),{answers,country:'VN',bridge:r.primary}).ready);}
assert.equal(programStatus(byId('equip'),state('en','bachelor','intense')).ready,true);
assert.equal(routeEligible('ifp',state('none','hs','ifp','tw')),false);
assert.equal(routeEligible('intense',state('en','college','intense')),true);
assert.equal(routeEligible('intense',state('en','hs','intense')),false);
assert.equal(resolveBridge({edu:'hs',lang:'en',bg:'none',exp:'none',route:'degree'},'VN').primary,'en');
assert.equal(resolveBridge({edu:'bachelor',lang:'en',bg:'none',exp:'none',route:'degree'},'VN').primary,'en');
assert.equal(resolveBridge({edu:'bachelor',lang:'en',bg:'none',exp:'none',route:'industry'},'VN').primary,'intense');
assert.equal(resolveBridge({edu:'hs',lang:'none',bg:'none',exp:'none',route:'mandarin'},'VN').primary,'ifp');
assert.equal(resolveBridge({edu:'hs',lang:'en',bg:'oc',exp:'none',route:'degree'},'MY').primary,'oc');
// status and Taiwan experience are separate: having studied or worked here only closes IFP
assert.equal(routeEligible('en',state('en','hs','en','tw')),true);
assert.equal(routeEligible('ifp',state('none','hs','ifp','none','VN','oc')),true);
assert.equal(routeEligible('en',state('en','hs','en','ocstudy')),false);
assert.equal(resolveBridge({edu:'hs',lang:'en',bg:'none',exp:'ocstudy',route:'degree'},'VN').primary,'oc');
assert.equal(resolveBridge({edu:'hs',lang:'zh',bg:'hkmo',exp:'none',route:'degree'},'HK').primary,'oc');
assert.ok(resolveBridge({edu:'hs',lang:'en',bg:'oc',exp:'none',route:'degree'},'MY').alts.includes('en'));
// the wanted degree: 2026–27 prospectus lists 5 doctoral programs (all Chinese-taught) and 12 master's programs
assert.deepEqual(programs.filter(p=>degreesOf(p).includes('phd')).map(p=>p.id).sort(),['csie','ee','ene','management-phd','mse']);
assert.equal(programs.filter(p=>degreesOf(p).includes('master')).length,12);
assert.ok(programs.filter(p=>degreesOf(p).includes('phd')).every(p=>p.lang==='zh'));
const want=(goal,edu,lang,bridge,bg='none',country='VN')=>({bridge,country,answers:{route:'degree',edu,lang,bg,exp:'none',goal}});
const lit=(st)=>programs.filter(p=>programStatus(p,st).ready).map(p=>p.id).sort();
assert.deepEqual(lit(want('phd','master','zh','zh')),['csie','ee','ene','management-phd','mse']);
assert.deepEqual(lit(want('master','bachelor','en','en')),['imba']);
assert.deepEqual(lit(want('postbac','bachelor','zh','zh')),['scm']);
assert.ok(!lit(want('bachelor','master','zh','zh')).includes('ccd')&&lit(want('bachelor','master','zh','zh')).includes('ee'));
assert.equal(levelLabel(byId('ee'),'phd').zh,'博士班');assert.equal(levelLabel(byId('ee'),'bachelor').zh,'學士班');assert.equal(levelLabel(byId('che'),'master').zh,'學士班');
assert.equal(programJourney(byId('ee'),'zh','master').length,3);
// an Overseas Chinese student who wants a master's is sent to the Chinese bridge, not their own
assert.equal(resolveBridge({route:'degree',edu:'bachelor',lang:'zh',bg:'oc',exp:'none',goal:'master'},'MY').primary,'zh');
assert.equal(resolveBridge({route:'degree',edu:'master',lang:'en',bg:'none',exp:'none',goal:'phd'},'VN').goalGap,true);
// the wanted degree and the other answers can't contradict each other
assert.deepEqual(goalBlockers({answers:{edu:'hs',goal:'phd'}}).map(b=>b.key),['goal','edu']);
assert.deepEqual(goalBlockers({answers:{edu:'master',goal:'phd'}}),[]);
assert.deepEqual(routeBlockers('ifp',{answers:{goal:'master'}}).map(b=>b.key),['goal']);
assert.deepEqual(routeBlockers('intense',{answers:{goal:'phd'}}).map(b=>b.key),['goal']);
assert.deepEqual(goalBlockers({answers:{goal:'ifp',exp:'tw'}}).map(b=>b.key),['goal']);
assert.equal(resolveBridge({route:'mandarin',edu:'hs',lang:'none',bg:'none',exp:'none',goal:'ifp'},'VN').primary,'ifp');
// mainland China: no bridge fits, the page points to the International & Cross-Strait Affairs office
assert.ok(isMainland('CN')&&!isMainland('HK'));
for(const k of ['zh','en','ifp','intense','oc'])assert.equal(routeEligible(k,{answers:{edu:'bachelor',lang:'en',bg:'none',exp:'none'},country:'CN'}),false);
console.log('Catalog and admission checks passed: 38 programs, 13 IFP, 5 English undergraduate, 2 INTENSE.');
