import assert from 'node:assert/strict';
import { ISLANDS, BRIDGES } from '../js/content.js';
import { PROGRAM_PROFILES } from '../js/program-profiles.js';
import { resolveBridge, programStatus, programJourney, routeEligible } from '../js/logic.js';
const programs = ISLANDS.flatMap(i => i.programs);
assert.equal(programs.length, 37);
assert.equal(new Set(programs.map(p => p.id)).size, 37);
assert.equal(programs.filter(p => p.bridges.includes('ifp')).length, 13);
assert.equal(programs.filter(p => p.bridges.includes('en') && !p.level).length, 5);
assert.equal(programs.filter(p => p.bridges.includes('intense')).length, 1);
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
const state = (lang, edu='hs', bridge=lang, bg='none', country='VN') => ({bridge, country, answers:{lang, edu, bg, route:'degree'}});
const byId=id=>programs.find(p=>p.id===id);
assert.equal(byId('intense-mae'),undefined);
assert.equal(routeEligible('intense',state('zh','bachelor','intense')),false);
assert.equal(programStatus(byId('csie'),state('en')).ready,false);
assert.equal(programStatus(byId('ipai'),state('en')).ready,true);
assert.equal(programStatus(byId('imba'),state('en')).ready,false);
assert.equal(programStatus(byId('imba'),state('en','bachelor')).ready,true);
assert.equal(programStatus(byId('csie'),state('none','hs','ifp')).ready,true);
assert.equal(programStatus(byId('filmtv'),state('none','hs','ifp')).ready,false);
assert.equal(programJourney(byId('csie'),'ifp').length,5);
assert.equal(programJourney(byId('equip'),'intense').length,3);
assert.equal(programJourney(byId('scm'),'zh').length,5);
assert.equal(programStatus(byId('equip'),state('en','bachelor','intense')).ready,true);
assert.equal(routeEligible('ifp',state('none','hs','ifp','tw')),false);
assert.equal(routeEligible('intense',state('en','college','intense')),false);
assert.equal(resolveBridge({edu:'hs',lang:'en',bg:'none',route:'degree'},'VN').primary,'en');
assert.equal(resolveBridge({edu:'bachelor',lang:'en',bg:'none',route:'degree'},'VN').primary,'en');
assert.equal(resolveBridge({edu:'bachelor',lang:'en',bg:'none',route:'industry'},'VN').primary,'intense');
assert.equal(resolveBridge({edu:'hs',lang:'none',bg:'none',route:'mandarin'},'VN').primary,'ifp');
assert.equal(resolveBridge({edu:'hs',lang:'en',bg:'oc',route:'degree'},'MY').primary,'oc');
console.log('Catalog and admission checks passed: 37 programs, 13 IFP, 5 English undergraduate, 1 English INTENSE.');
