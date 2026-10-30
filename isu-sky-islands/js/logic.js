import { INTENSE_COUNTRIES, ISLANDS, BRIDGES, LIFE_CARDS, MAINLAND } from './content.js';
import { PROGRAM_PROFILES } from './program-profiles.js';
const bi = (zh, en) => ({ zh, en });

// Recommendations are an initial screen, never an admission decision.
// Mainland China is outside these routes (separate cross-strait rules): no bridge fits, the page points to the office.
export const isMainland = (country) => MAINLAND.codes.includes(country);
// International-student routes: foreign nationals and Overseas Chinese, unless they already studied here as 僑生.
const foreignOk = ({ bg, exp }) => bg !== 'hkmo' && exp !== 'ocstudy';
export function routeEligible(bridge, { answers = {}, country } = {}) {
  const { edu, bg, exp } = answers;
  if (isMainland(country)) return false;
  if (bridge === 'oc') return bg === 'oc' || bg === 'hkmo' || exp === 'ocstudy';
  if (!foreignOk(answers)) return false;
  if (bridge === 'ifp') return exp === 'none' && !!edu;
  if (bridge === 'intense') return ['en', 'zh'].includes(answers.lang) && INTENSE_COUNTRIES.includes(country) && ['college', 'bachelor', 'master'].includes(edu);
  return true;
}

// What already-given answers rule a route out? Works on partial answers, so the question panel can
// grey out a conflicting choice the moment it appears (e.g. high school + INTENSE).
const blockReasons = {
  'intense:edu': bi('INTENSE 需專科（D3）以上學歷，高中畢業不能選', 'INTENSE needs a D3 diploma or higher, not high school'),
  'intense:lang': bi('INTENSE 需能以中文或英文上課', 'INTENSE needs Chinese or English study ability'),
  'intense:bg': bi('港澳學生請走僑生管道，不適用 INTENSE', 'Hong Kong and Macau students apply through their own route, not INTENSE'),
  'intense:exp': bi('曾以僑生身分在台讀書，不能再走外國學生管道', 'Having studied here as an Overseas Chinese student, you can’t switch to international routes'),
  'intense:country': bi('INTENSE 目前招收菲律賓、印度、印尼、越南、馬來西亞、泰國', 'INTENSE currently recruits from the Philippines, India, Indonesia, Vietnam, Malaysia and Thailand'),
  'ifp:bg': bi('IFP 只收外國籍學生，港澳學生請走僑生管道', 'IFP is for international students; Hong Kong and Macau students have their own route'),
  'ifp:exp': bi('IFP 限未曾在台讀書或工作的學生', 'IFP is for students who have not studied or worked in Taiwan'),
  'ifp:goal': bi('IFP 銜接的是學士班，不能接碩士、博士或學士後中醫', 'IFP leads to a bachelor’s degree, not to master’s, doctoral or post-baccalaureate study'),
  'intense:goal': bi('INTENSE 是二年制學士專班，不能讀碩士、博士或學士後中醫', 'INTENSE is a two-year bachelor’s program, not master’s, doctoral or post-baccalaureate study'),
};
// What the student wants to study. The IFP year leads into a bachelor's degree.
const GRAD_GOALS = ['master', 'phd', 'postbac'];
export const goalLevel = (goal) => goal === 'ifp' ? 'bachelor' : goal || null;
// Levels a program admits international students to (2026–27 prospectus); INTENSE counts as a bachelor's.
export const degreesOf = (p) => p.degrees || [!p.level || p.level === 'intense' ? 'bachelor' : p.level];
export const offersGoal = (p, goal) => !goal || degreesOf(p).includes(goalLevel(goal));
// A department with master's or doctoral study shows the level the student wants.
export const levelOf = (p, goal) => p.level === 'intense' ? 'intense' : goal && offersGoal(p, goal) ? goalLevel(goal) : p.level || 'bachelor';
const GOAL_EDU = { master: ['bachelor', 'master'], postbac: ['bachelor', 'master'], phd: ['master'] };
const goalReasons = {
  master: bi('讀碩士需要學士學位（含應屆）', 'A master’s needs a bachelor’s degree (graduands included)'),
  postbac: bi('學士後中醫需要學士學位', 'Post-baccalaureate Chinese Medicine needs a bachelor’s degree'),
  phd: bi('讀博士需要碩士學位', 'A PhD needs a master’s degree'),
};
// Conflicts between the wanted degree and the other answers, tagged with both questions so either chip greys out.
export function goalBlockers({ answers = {}, country } = {}) {
  const { goal, edu } = answers, out = [];
  if (goal === 'ifp') for (const b of routeBlockers('ifp', { answers, country })) if (b.key !== 'goal') out.push({ key: 'goal', reason: b.reason });
  if (GOAL_EDU[goal] && edu && !GOAL_EDU[goal].includes(edu)) out.push({ key: 'goal', reason: goalReasons[goal] }, { key: 'edu', reason: goalReasons[goal] });
  return out;
}
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
    if (answers.bg === 'hkmo') out.push('bg');
    if (answers.exp === 'ocstudy') out.push('exp');
    if (GRAD_GOALS.includes(answers.goal)) out.push('goal');
    if (country && !INTENSE_COUNTRIES.includes(country)) out.push('country');
  }
  if (bridge === 'ifp') {
    if (answers.bg === 'hkmo') out.push('bg');
    if (answers.exp && answers.exp !== 'none') out.push('exp');
    if (GRAD_GOALS.includes(answers.goal)) out.push('goal');
  }
  return out.map((key) => ({ key, reason: blockReasons[bridge + ':' + key] }));
}
export const routeOfAnswer = (route) => route === 'industry' ? 'intense' : route === 'mandarin' ? 'ifp' : null;

export function resolveBridge(answers, country) {
  const { lang, bg, route, goal } = answers;
  const state = { answers, country };
  // Overseas Chinese default to their own bridge but may also take the international ones (shown as alternatives).
  let primary = bg === 'oc' || !foreignOk(answers) ? 'oc' : lang === 'en' ? 'en' : lang === 'zh' ? 'zh' : routeEligible('ifp', state) && !GRAD_GOALS.includes(goal) ? 'ifp' : 'zh';
  if (route === 'industry' && routeEligible('intense', state)) primary = 'intense';
  if ((route === 'mandarin' || goal === 'ifp') && routeEligible('ifp', state)) primary = 'ifp';
  // e.g. an Overseas Chinese student who wants a master's: their own bridge has none, the Chinese one does
  const usable = (k) => routeEligible(k, state) && ISLANDS.some(i => i.programs.some(p => programStatus(p, { ...state, bridge: k }).ready));
  if (goal && !usable(primary)) primary = [lang === 'en' ? 'en' : 'zh', 'zh', 'en', 'oc'].find(usable) || primary;
  const alts = Object.keys(BRIDGES).filter(k => k !== primary && routeEligible(k, state));
  // goalGap: no bridge open to this student reaches the wanted degree (e.g. a PhD in English: every doctoral program is Chinese-taught)
  const needLanguage = lang === 'none' && primary !== 'ifp';
  return { primary, alts, needLanguage, goalGap: !!goal && !needLanguage && !usable(primary) };
}
export const programReachable = (program, bridge) => program.bridges.includes(bridge);
export const islandsReachedBy = (bridge) => ISLANDS.filter(i => i.programs.some(p => programReachable(p, bridge)));
export const findProgram = (islandId, programId) => ISLANDS.find(i => i.id === islandId)?.programs.find(p => p.id === programId);
export const bridgeColor = (b) => BRIDGES[b]?.color ?? '#999';

export function programStatus(program, state) {
  const { edu, goal } = state.answers, level = levelOf(program, goal);
  // graduate study goes through the international-student bridges; IFP and the Overseas Chinese admission here lead to bachelor's degrees
  const route = programReachable(program, state.bridge) && (['bachelor', 'intense'].includes(level) || ['zh', 'en'].includes(state.bridge));
  const language = state.bridge === 'ifp' && route ? true : program.lang === state.answers.lang;
  const education = level === 'phd' ? edu === 'master' : ['master', 'postbac'].includes(level) ? ['bachelor', 'master'].includes(edu) : level === 'intense' ? ['college', 'bachelor', 'master'].includes(edu) : !!edu;
  const wanted = offersGoal(program, goal);
  const eligible = routeEligible(state.bridge, state);
  return { route, language, education, wanted, eligible, ready: route && language && education && wanted && eligible };
}
export const yearsLabel = (p, goal) => { const l = levelOf(p, goal); return l === 'intense' ? bi('二年與企業', 'Two years & industry') : l === 'master' ? bi('碩士歷程', 'Master’s journey') : l === 'phd' ? bi('博士歷程', 'Doctoral journey') : l === 'postbac' ? bi('五年歷程', 'Five-year journey') : bi('四年歷程', 'Four-year journey'); };
export const levelLabel = (p, goal) => { const l = levelOf(p, goal); return l === 'intense' ? bi('INTENSE 二年制', 'INTENSE · 2 years') : l === 'master' ? bi('碩士班', 'Master’s') : l === 'phd' ? bi('博士班', 'Doctoral') : l === 'postbac' ? bi('學士後五年制', 'Post-baccalaureate · 5 years') : bi('學士班', 'Bachelor’s'); };
// Graduate study in a department whose profile describes its bachelor's years. Durations: 2026–27 prospectus.
const GRAD_JOURNEY = {
  master: [
    { title: bi('第 1 年 · 研究所課程', 'Year 1 · Graduate courses'), body: bi('修習研究所核心與選修課程，找到指導教授與研究方向。', 'Take core and elective graduate courses and find an advisor and research direction.') },
    { title: bi('第 2 年 · 研究與論文', 'Year 2 · Research and thesis'), body: bi('在實驗室或研究團隊進行研究，撰寫碩士論文。', 'Carry out research in a lab or team and write your thesis.') },
    { title: bi('學位口試 · 畢業', 'Thesis defence · Graduate'), body: bi('通過論文口試取得碩士學位；修業年限 1–4 年。', 'Pass the thesis defence to earn the master’s degree; study takes 1–4 years.') },
  ],
  phd: [
    { title: bi('博士課程', 'Doctoral courses'), body: bi('修習博士班課程，和指導教授確立研究主題。', 'Take doctoral courses and settle a research topic with your advisor.') },
    { title: bi('資格考與研究發表', 'Qualifying exam & publications'), body: bi('依系所規定通過資格考，進行獨立研究並發表成果。', 'Pass the qualifying requirements set by the department, then research independently and publish.') },
    { title: bi('博士論文口試', 'Dissertation defence'), body: bi('完成博士論文並通過口試；修業年限 2–7 年。', 'Complete and defend your dissertation; study takes 2–7 years.') },
  ],
};

export function programJourney(p, bridge, goal) {
  const skills = PROGRAM_PROFILES[p.id].skills, level = levelOf(p, goal);
  if (level !== (p.level || 'bachelor') && GRAD_JOURNEY[level]) return GRAD_JOURNEY[level];
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
export function studyPath(program, bridge, goal) {
  const path = [];
  if (bridge === 'ifp' && program.bridges.includes('ifp')) path.push({ kind: 'ifp', name: bi('國際專修部 IFP', 'International Foundation Program'), note: bi('1 年華語先修 · TOCFL A2', '1 Mandarin year · TOCFL A2') });
  if (bridge === 'intense' && program.bridges.includes('intense')) path.push({ kind: 'intense', name: bi('INTENSE 就業島 · 合作企業面試', 'INTENSE Career island · Partner company interview'), note: bi('先取得企業認同', 'Gain company approval first') });
  path.push({ kind: 'program', name: program.name, note: levelLabel(program, goal) });
  return path;
}

export function matchesConnectionFilter(program,filter) {
  if(filter==='all')return true;
  if(filter==='ifp')return program.bridges.includes('ifp');
  if(filter==='intense')return program.bridges.includes('intense');
  return program.lang===filter;
}
