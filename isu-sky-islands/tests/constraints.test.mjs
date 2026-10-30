// Every combination of answers the question page allows: lit programs must obey all admission rules,
// and the recommended bridge must always leave at least one program to anchor.
import assert from 'node:assert/strict';
const L = await import('../js/logic.js');
const { ISLANDS } = await import('../js/content.js');
const progs = ISLANDS.flatMap(i => i.programs);
const bad = [], dead = [];
let combos = 0;
for (const route of ['degree','mandarin','industry']) for (const edu of ['hs','college','bachelor','master']) for (const lang of ['zh','en','none']) for (const bg of ['none','oc','tw']) for (const country of ['VN','US','XX','MY']) {
  const answers = { route, edu, lang, bg };
  const intent = L.routeOfAnswer(route);
  if (intent && L.routeBlockers(intent, { answers, country }).length) continue; // greyed out in the UI
  const r = L.resolveBridge(answers, country);
  for (const bridge of [r.primary, ...r.alts]) {
    combos++;
    const s = { answers, country, bridge };
    const ready = progs.filter(p => L.programStatus(p, s).ready);
    for (const p of ready) {
      const why = [];
      if (!p.bridges.includes(bridge)) why.push('bridge');
      if (bridge !== 'ifp' && p.lang !== lang) why.push('language');
      if (p.level === 'intense' && !['college','bachelor','master'].includes(edu)) why.push('intense-edu');
      if (['master','postbac'].includes(p.level) && !['bachelor','master'].includes(edu)) why.push('grad-edu');
      if (p.level === 'phd' && edu !== 'master') why.push('phd-edu');
      if (bridge === 'intense' && !['PH','IN','ID','VN','MY','TH'].includes(country)) why.push('intense-country');
      if (bridge === 'ifp' && bg !== 'none') why.push('ifp-bg');
      if (why.length) bad.push([JSON.stringify(answers), country, bridge, p.id, why.join(',')]);
    }
    if (bridge === r.primary && !ready.length && !r.needLanguage) dead.push([JSON.stringify(answers), country, bridge]);
  }
}
assert.equal(bad.length, 0, JSON.stringify(bad.slice(0, 5)));
assert.equal(dead.length, 0, JSON.stringify(dead.slice(0, 5)));
console.log('Constraint sweep passed:', combos, 'answer/bridge combinations, every lit program obeys route, language, education, country and background rules.');
