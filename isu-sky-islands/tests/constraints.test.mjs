// Every combination of answers the question page allows: lit programs must obey all admission rules,
// and the recommended bridge must always leave at least one program to anchor.
import assert from 'node:assert/strict';
const L = await import('../js/logic.js');
const { ISLANDS } = await import('../js/content.js');
const progs = ISLANDS.flatMap(i => i.programs);
const bad = [], dead = [], gaps = new Set();
let combos = 0;
for (const route of ['degree','mandarin','industry']) for (const edu of ['hs','college','bachelor','master']) for (const goal of ['bachelor','master','phd','postbac','ifp']) for (const lang of ['zh','en','none']) for (const bg of ['none','oc','hkmo']) for (const exp of ['none','tw','ocstudy']) for (const country of ['VN','US','XX','MY','HK','CN']) {
  const answers = { route, edu, lang, bg, exp, goal };
  const intent = L.routeOfAnswer(route);
  if (intent && L.routeBlockers(intent, { answers, country }).length) continue; // greyed out in the UI
  if (L.goalBlockers({ answers, country }).length) continue;
  if (goal === 'ifp' && route !== 'mandarin') continue; // choosing "IFP first" switches the route to Mandarin
  const r = L.resolveBridge(answers, country);
  if (country === 'CN') { // mainland: every bridge closed, the page sends the student to the office instead
    for (const bridge of ['zh','en','ifp','intense','oc']) if (L.routeEligible(bridge, { answers, country })) bad.push([JSON.stringify(answers), country, bridge, '-', 'mainland']);
    continue;
  }
  for (const bridge of [r.primary, ...r.alts]) {
    combos++;
    const s = { answers, country, bridge };
    const ready = progs.filter(p => L.programStatus(p, s).ready);
    for (const p of ready) {
      const why = [];
      if (!p.bridges.includes(bridge)) why.push('bridge');
      if (bridge !== 'ifp' && p.lang !== lang) why.push('language');
      const level = L.levelOf(p, goal);
      const wanted = goal === 'ifp' ? 'bachelor' : goal; // IFP leads to a bachelor's; INTENSE is a two-year bachelor's
      if (level !== wanted && !(level === 'intense' && wanted === 'bachelor')) why.push('goal');
      if (['master','phd','postbac'].includes(level) && !['zh','en'].includes(bridge)) why.push('grad-bridge');
      if (level === 'intense' && !['college','bachelor','master'].includes(edu)) why.push('intense-edu');
      if (['master','postbac'].includes(level) && !['bachelor','master'].includes(edu)) why.push('grad-edu');
      if (level === 'phd' && edu !== 'master') why.push('phd-edu');
      if (level === 'phd' && p.lang !== 'zh') why.push('phd-lang');
      if (bridge === 'intense' && !['PH','IN','ID','VN','MY','TH'].includes(country)) why.push('intense-country');
      if (bridge === 'ifp' && (bg === 'hkmo' || exp !== 'none')) why.push('ifp-bg');
      if (bridge !== 'oc' && (bg === 'hkmo' || exp === 'ocstudy')) why.push('foreign-route');
      if (bridge === 'oc' && bg === 'none' && exp !== 'ocstudy') why.push('oc-route');
      if (why.length) bad.push([JSON.stringify(answers), country, bridge, p.id, why.join(',')]);
    }
    if (bridge === r.primary && !ready.length && r.goalGap) gaps.add([goal, lang, bg, exp].join(':'));
    if (bridge === r.primary && !ready.length && !r.needLanguage && !r.goalGap) dead.push([JSON.stringify(answers), country, bridge]);
  }
}
assert.equal(bad.length, 0, JSON.stringify(bad.slice(0, 5)));
assert.equal(dead.length, 0, JSON.stringify(dead.slice(0, 5)));
// the only dead ends are honest ones: the wanted degree isn't taught in the student's language at all
for (const g of gaps) // or the student can only use the Overseas Chinese admission, which ISU runs for bachelor's programs only (2027 prospectus)
assert.ok(/^(phd|postbac):en:/.test(g) || /^(master|phd|postbac):\w+:(hkmo:\w+|\w+:ocstudy)$/.test(g), g);
assert.ok(gaps.size > 0);
console.log('Constraint sweep passed:', combos, 'answer/bridge combinations, every lit program obeys route, language, education, country, status and Taiwan-experience rules, and only the wanted degree level lights up; mainland China closes every bridge.');
