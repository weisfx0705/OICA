import { INTENSE_COUNTRIES, ISLANDS, BRIDGES } from './content.js';
import { PROGRAM_PROFILES } from './program-profiles.js';
const bi = (zh, en) => ({ zh, en });

// Recommendations are an initial screen, never an admission decision.
export function routeEligible(bridge, { answers = {}, country } = {}) {
  const { edu, bg } = answers;
  if (bridge === 'ifp') return bg === 'none' && !!edu;
  if (bridge === 'intense') return bg !== 'oc' && INTENSE_COUNTRIES.includes(country) && ['bachelor', 'master'].includes(edu);
  if (bridge === 'oc') return bg === 'oc';
  return bg !== 'oc';
}

export function resolveBridge(answers, country) {
  const { lang, bg, route } = answers;
  const state = { answers, country };
  let primary = bg === 'oc' ? 'oc' : lang === 'en' ? 'en' : lang === 'zh' ? 'zh' : bg === 'none' ? 'ifp' : 'zh';
  if (route === 'industry' && routeEligible('intense', state)) primary = 'intense';
  if (route === 'mandarin' && routeEligible('ifp', state)) primary = 'ifp';
  const alts = Object.keys(BRIDGES).filter(k => k !== primary && routeEligible(k, state));
  return { primary, alts, needLanguage: lang === 'none' && primary !== 'ifp' };
}
export const programReachable = (program, bridge) => program.bridges.includes(bridge);
export const islandsReachedBy = (bridge) => ISLANDS.filter(i => i.programs.some(p => programReachable(p, bridge)));
export const findProgram = (islandId, programId) => ISLANDS.find(i => i.id === islandId)?.programs.find(p => p.id === programId);
export const bridgeColor = (b) => BRIDGES[b]?.color ?? '#999';

export function programStatus(program, state) {
  const route = programReachable(program, state.bridge);
  const language = state.bridge === 'ifp' && route ? true : program.lang === state.answers.lang;
  const advanced = ['master', 'postbac', 'intense'].includes(program.level);
  const education = program.level === 'phd' ? state.answers.edu === 'master' : advanced ? ['bachelor', 'master'].includes(state.answers.edu) : !!state.answers.edu;
  const eligible = routeEligible(state.bridge, state);
  return { route, language, education, eligible, ready: route && language && education && eligible };
}
export const yearsLabel = p => p.level === 'intense' ? bi('二年與企業', 'Two years & industry') : p.level === 'master' ? bi('碩士歷程', 'Master’s journey') : p.level === 'phd' ? bi('博士歷程', 'Doctoral journey') : p.level === 'postbac' ? bi('五年歷程', 'Five-year journey') : bi('四年歷程', 'Four-year journey');
export const levelLabel = p => p.level === 'intense' ? bi('INTENSE 二年制', 'INTENSE · 2 years') : p.level === 'master' ? bi('碩士班', 'Master’s') : p.level === 'phd' ? bi('博士班', 'Doctoral') : p.level === 'postbac' ? bi('學士後五年制', 'Post-baccalaureate · 5 years') : bi('學士班', 'Bachelor’s');

export function programJourney(p, bridge) {
  const skills = PROGRAM_PROFILES[p.id].skills;
  if (p.level === 'intense') return [
    { title: bi('第 1 年 · 在校學習', 'Year 1 · On campus'), body: bi(skills[0].zh + '，連結' + skills[1].zh + '。', skills[0].en + ', connected with ' + skills[1].en.toLowerCase() + '.') },
    { title: bi('第 2 年 · 企業實習', 'Year 2 · Company internship'), body: bi(skills[2].zh + '；' + (p.lang === 'en' ? '中文達 A2' : '中文達 B1') + '。', skills[2].en + '; Chinese ' + (p.lang === 'en' ? 'A2' : 'B1') + ' required.') },
    { title: bi('畢業後 · 依約在台工作', 'After graduation · Employment'), body: bi('政府與企業受獎者之工作義務，依受獎期間與契約確認。', 'Government and company scholarship recipients follow the employment obligation in their agreement.') },
  ];
  if (p.level === 'master' || p.level === 'phd') return skills.map((body, i) => ({ title: bi('研究階段 ' + (i + 1), 'Research phase ' + (i + 1)), body }));
  const steps = skills.map((body, i) => ({ title: bi('大' + ['一','二','三','四'][i], 'Year ' + (i + 1)), body }));
  if (p.level === 'postbac') steps.push({ title: bi('第 5 年 · 臨床整合', 'Year 5 · Clinical integration'), body: bi('西醫見習、中醫實習與畢業要求依系所規劃完成。', 'Complete clerkships, Chinese medicine internship and department graduation requirements.') });
  if (bridge === 'ifp' && p.bridges.includes('ifp')) {
    steps.unshift({ title: bi('先修年 · 華語島', 'Foundation year · Mandarin island'), body: bi('先讀 720 小時華語，TOCFL 聽讀達 A2 才能進入本系學士班。', 'Complete 720 hours of Mandarin and reach TOCFL A2 in listening and reading before degree study.') });
    steps[2] = { ...steps[2], body: bi(steps[2].body.zh + '；升大二須達 TOCFL B1。', steps[2].body.en + '; TOCFL B1 is required for Year 2.') };
  }
  return steps;
}
