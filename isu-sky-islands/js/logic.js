import { INTENSE_COUNTRIES, ISLANDS, BRIDGES, LIFE_CARDS } from './content.js';
import { PROGRAM_PROFILES } from './program-profiles.js';
const bi = (zh, en) => ({ zh, en });

// Recommendations are an initial screen, never an admission decision.
export function routeEligible(bridge, { answers = {}, country } = {}) {
  const { edu, bg } = answers;
  if (bridge === 'ifp') return bg === 'none' && !!edu;
  if (bridge === 'intense') return ['en', 'zh'].includes(answers.lang) && bg !== 'oc' && INTENSE_COUNTRIES.includes(country) && ['college', 'bachelor', 'master'].includes(edu);
  if (bridge === 'oc') return bg === 'oc';
  return bg !== 'oc';
}

// What already-given answers rule a route out? Works on partial answers, so the question panel can
// grey out a conflicting choice the moment it appears (e.g. high school + INTENSE).
const blockReasons = {
  'intense:edu': bi('INTENSE 需專科（D3）以上學歷，高中畢業不能選', 'INTENSE needs a D3 diploma or higher, not high school'),
  'intense:lang': bi('INTENSE 需能以中文或英文上課', 'INTENSE needs Chinese or English study ability'),
  'intense:bg': bi('僑生、港澳生請走僑生管道，不適用 INTENSE', 'Overseas Chinese and HK/Macau students apply through their own route, not INTENSE'),
  'intense:country': bi('INTENSE 目前招收菲律賓、印度、印尼、越南、馬來西亞、泰國', 'INTENSE currently recruits from the Philippines, India, Indonesia, Vietnam, Malaysia and Thailand'),
  'ifp:bg': bi('IFP 限未曾在台就學或工作的外國學生', 'IFP is for international students who have not studied or worked in Taiwan'),
};
// "What do you hope to gain in Taiwan?" is multiple choice; older saves hold a single id.
export const chosenLives = (life) => (Array.isArray(life) ? life : life ? [life] : []).map((id) => LIFE_CARDS.find((c) => c.id === id)).filter(Boolean);
export function toggleLife(life, id) {
  const now = new Set(Array.isArray(life) ? life : life ? [life] : []);
  if (now.has(id)) now.delete(id);
  else if (id === 'unsure') { now.clear(); now.add(id); } // "not sure yet" stands alone
  else { now.delete('unsure'); now.add(id); }
  return [...now];
}

export function routeBlockers(bridge, { answers = {}, country } = {}) {
  const out = [];
  if (bridge === 'intense') {
    if (answers.edu && !['college', 'bachelor', 'master'].includes(answers.edu)) out.push('edu');
    if (answers.lang && !['en', 'zh'].includes(answers.lang)) out.push('lang');
    if (answers.bg === 'oc') out.push('bg');
    if (country && !INTENSE_COUNTRIES.includes(country)) out.push('country');
  }
  if (bridge === 'ifp' && answers.bg && answers.bg !== 'none') out.push('bg');
  return out.map((key) => ({ key, reason: blockReasons[bridge + ':' + key] }));
}
export const routeOfAnswer = (route) => route === 'industry' ? 'intense' : route === 'mandarin' ? 'ifp' : null;

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
  const advanced = ['master', 'postbac'].includes(program.level);
  const education = program.level === 'phd' ? state.answers.edu === 'master' : advanced ? ['bachelor', 'master'].includes(state.answers.edu) : program.level === 'intense' ? ['college', 'bachelor', 'master'].includes(state.answers.edu) : !!state.answers.edu;
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

// The whole road the student actually takes, in order: a hub stop (IFP Mandarin year, or the INTENSE
// company interview) comes before the program itself.
export function studyPath(program, bridge) {
  const path = [];
  if (bridge === 'ifp' && program.bridges.includes('ifp')) path.push({ kind: 'ifp', name: bi('國際專修部 IFP', 'International Foundation Program'), note: bi('1 年華語先修 · TOCFL A2', '1 Mandarin year · TOCFL A2') });
  if (bridge === 'intense' && program.bridges.includes('intense')) path.push({ kind: 'intense', name: bi('INTENSE 就業島 · 合作企業面試', 'INTENSE Career island · Partner company interview'), note: bi('先取得企業認同', 'Gain company approval first') });
  path.push({ kind: 'program', name: program.name, note: levelLabel(program) });
  return path;
}

export function matchesConnectionFilter(program,filter) {
  if(filter==='all')return true;
  if(filter==='ifp')return program.bridges.includes('ifp');
  if(filter==='intense')return program.bridges.includes('intense');
  return program.lang===filter;
}
