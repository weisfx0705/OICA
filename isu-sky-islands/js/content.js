// 遊戲內容資料（國際處每年更新這個檔案即可，不需要動其他程式）
// 每個文字欄位都是 { zh, en }；新增語言時在同一層加 vi、id 等鍵即可，缺漏時會自動退回英文。
// 金額、日期、名單的依據：2026–2027 外國學生／國際專修部／INTENSE 英文簡章、116 僑港澳單招簡章、會計處 2026 收費表。

export const META = {
  updated: '2026-10-29',
  site: 'https://international.isu.edu.tw/',
  contactEmail: 'oia@isu.edu.tw',
  towerPhoto: 'assets/photos/calligraphy.webp',
  ifpPhoto: 'assets/photos/ifp-class.webp',
};

// 品牌色取自 international.isu.edu.tw 的全站設定，與校徽藍搭配。
export const BRAND = {
  indigo: '#36348E',
  gold: '#FFC53A',
  periwinkle: '#CDD4FB',
  mist: '#B7D8EF',
  logoBlue: '#42A8F0',
  ink: '#292929',
};

// 入學管道＝橋。color 用於橋、旗子與路線卡。
export const BRIDGES = {
  zh: {
    color: '#E07A5F',
    name: { zh: '中文橋', en: 'Chinese Bridge' },
    tag: { zh: '外國學生・中文授課', en: 'International students · Chinese-taught' },
    who: { zh: '中文達 TOCFL A2 以上的外國學生', en: 'International students with TOCFL A2 Chinese or above' },
    how: { zh: '依外國學生申請入學，直接進入中文授課學士班或碩士班。', en: 'Apply as an international student and go straight into a Chinese-taught bachelor’s or master’s program.' },
    applyUrl: 'https://enroll.isu.edu.tw/DI/',
    infoUrl: 'https://international.isu.edu.tw/how-to-apply/',
    deadline: { zh: '秋季班 2/1–7/5，春季班 9/1–12/15（2026–2027，分梯審查）', en: 'Fall: Feb 1 – Jul 5 · Spring: Sep 1 – Dec 15 (2026–27, rolling rounds)' },
    timeline: [
      { zh: '大一', en: 'Year 1' }, { zh: '大二', en: 'Year 2' }, { zh: '大三・實習', en: 'Year 3 · Internship' }, { zh: '大四・畢業', en: 'Year 4 · Graduate' },
    ],
    scholarship: { zh: '外國學生新生最高可獲第一年免學雜費＋宿舍補助最高 NT$20,000；在學生最高一學期免學雜費。續領需班排前 40%、操行 85 分以上。', en: 'New international students can receive up to a full first-year tuition waiver plus up to NT$20,000 for housing; continuing students up to one semester’s tuition. Renewal needs top 40% ranking and conduct score 85+.' },
    chinese: { zh: '入學需 TOCFL A2 以上；校內有華語中心可以繼續進修。', en: 'TOCFL A2 or above to enter; keep improving at the campus Chinese Language Center.' },
  },
  en: {
    color: '#4A8BD6',
    name: { zh: '英文橋', en: 'English Bridge' },
    tag: { zh: '外國學生・全英語授課', en: 'International students · English-taught' },
    who: { zh: '英文達 CEFR B1 以上、中文還不行的學生', en: 'Students with CEFR B1 English who don’t speak Chinese yet' },
    how: { zh: '5 個全英語學士學程，或碩士班 IMBA。', en: 'Five English-taught bachelor’s programs, or the IMBA master’s program.' },
    applyUrl: 'https://enroll.isu.edu.tw/DI/',
    infoUrl: 'https://international.isu.edu.tw/english-taught-programs/',
    deadline: { zh: '秋季班 2/1–7/5，春季班 9/1–12/15（2026–2027，分梯審查）', en: 'Fall: Feb 1 – Jul 5 · Spring: Sep 1 – Dec 15 (2026–27, rolling rounds)' },
    timeline: [
      { zh: '大一', en: 'Year 1' }, { zh: '大二', en: 'Year 2' }, { zh: '大三・實習', en: 'Year 3 · Internship' }, { zh: '大四・畢業', en: 'Year 4 · Graduate' },
    ],
    scholarship: { zh: '外國學生新生最高可獲第一年免學雜費＋宿舍補助最高 NT$20,000；在學生最高一學期免學雜費。', en: 'New international students can receive up to a full first-year tuition waiver plus up to NT$20,000 for housing; continuing students up to one semester’s tuition.' },
    chinese: { zh: '全英語上課，也可以在華語中心慢慢學中文，生活會更方便。', en: 'Classes are in English — and you can pick up Chinese at the Chinese Language Center to make daily life easier.' },
  },
  ifp: {
    color: '#3E9E86',
    name: { zh: '華語橋', en: 'Mandarin Bridge' },
    tag: { zh: '國際專修部 IFP', en: 'International Foundation Program' },
    who: { zh: '高中畢業、還不會中文、以前沒在台灣讀書或工作過的外國學生', en: 'High school graduates new to Chinese who have never studied or worked in Taiwan' },
    how: { zh: '先讀 1 年華語先修（720 小時，達 TOCFL A2），再讀 4 年學士班。', en: 'One year of Mandarin (720 hours, reach TOCFL A2), then a four-year bachelor’s degree.' },
    applyUrl: 'https://enroll.isu.edu.tw/DQ/',
    infoUrl: 'https://international.isu.edu.tw/international-foundation-program/',
    deadline: { zh: '秋季班 2/1–6/14，春季班 9/1–11/8（2026–2027）', en: 'Fall: Feb 1 – Jun 14 · Spring: Sep 1 – Nov 8 (2026–27)' },
    timeline: [
      { zh: '華語年・A2', en: 'Mandarin year · A2' }, { zh: '大一', en: 'Year 1' }, { zh: '大二・B1', en: 'Year 2 · B1' }, { zh: '大三・實習', en: 'Year 3 · Internship' }, { zh: '大四・畢業', en: 'Year 4 · Graduate' },
    ],
    scholarship: { zh: '華語先修期間學校沒有獎學金；升上大一後，依 TOCFL 等級補助住宿費：A2 每學期 1 萬、B1 1.5 萬、B2 2 萬。錄取時核定的外國學生新生獎學金，依先修期出席率（90% 以上全額）在升大一後發放。', en: 'No scholarship during the Mandarin year. Once you start Year 1, housing is subsidised by your TOCFL level: A2 NT$10,000, B1 NT$15,000, B2 NT$20,000 per semester. Your new-student scholarship is paid from Year 1 based on Mandarin-year attendance (full amount at 90%+).' },
    chinese: { zh: '先修期滿要達 TOCFL 聽讀 A2 才能升大一，升大二需達 B1。114-1 學期先修期滿通過率 94.7%。', en: 'Reach TOCFL A2 (listening & reading) to start Year 1, and B1 by Year 2. In the 2025 fall cohort, 94.7% passed.' },
    rule: { zh: '先修期間不能轉系；讀完大一後只能轉到製造、營造、農業、長照、電商與服務類相關系所。', en: 'No department transfers during the Mandarin year; after Year 1, transfers are limited to manufacturing, construction, agriculture, long-term care, e-commerce and service fields.' },
  },
  intense: {
    color: '#D9A23B',
    name: { zh: '產業橋', en: 'Industry Bridge' },
    tag: { zh: '新型專班 INTENSE', en: 'INTENSE Program' },
    who: { zh: '菲律賓、印度、印尼、越南、馬來西亞、泰國的 D3、D4、S1、S2 在學生或畢業生；學歷認定依當期簡章。', en: 'Students and graduates (D3, D4, S1, S2) from the Philippines, India, Indonesia, Vietnam, Malaysia or Thailand; credential recognition follows the intake prospectus.' },
    how: { zh: '2027 春季班：2 年修業（1 年在校＋1 年企業實習）；受獎者畢業後須依約在台工作。', en: 'Spring 2027: two years of study, with one year on campus and one year of company internship; scholarship recipients then work in Taiwan under their agreement.' },
    applyUrl: 'https://forms.gle/W3CEyJ7C61GQtr8a9',
    infoUrl: 'https://international.isu.edu.tw/intense-program/',
    prospectusUrl: 'https://aa.isu.edu.tw/storage/files/FbBnQA6DtVcbXP0yHeRn9ESz40VpEeeLeHeuoWb8.pdf',
    deadline: { zh: '2027 春季班申請至 2026-11-20；2027-02-22 開學', en: 'Spring 2027: apply by Nov 20, 2026; classes start Feb 22, 2027' },
    timeline: [
      { zh: '第 1 年・在校', en: 'Year 1 · Campus' }, { zh: '第 2 年・企業實習', en: 'Year 2 · Internship' }, { zh: '畢業・依約就業', en: 'Graduate · Employment' },
    ],
    scholarship: { zh: '政府獎學金：學雜費最長 2 年、每學期最高 NT$50,000；首次來台行政費最高 1 萬、單程機票最高 9 千。企業在校期間每月至少 NT$10,000 生活津貼；校外實習津貼不低於基本工資。', en: 'Government scholarship: tuition for up to two years (max NT$50,000 per semester), up to NT$10,000 for arrival costs and NT$9,000 for a one-way flight. Companies pay at least NT$10,000 a month while you study, and at least minimum wage during internships.' },
    chinese: { zh: '2026–2027 簡章列出兩個專班：英語授課的設備工程（英語 CEFR B1 以上，第二年中文達 TOCFL A2），以及中文授課的機械與自動化工程（中文 TOCFL A2 以上，第二年達 B1）。', en: 'The 2026–27 prospectuses list two programs: English-taught Equipment Engineering (CEFR B1 English; TOCFL A2 Chinese in Year 2) and Chinese-taught Mechanical and Automation Engineering (TOCFL A2 Chinese; B1 in Year 2).' },
  },
  oc: {
    color: '#8A6CC4',
    name: { zh: '僑生橋', en: 'Overseas Chinese Bridge' },
    tag: { zh: '僑生・港澳生', en: 'Overseas Chinese · Hong Kong · Macau' },
    who: { zh: '華裔僑生、港澳學生', en: 'Overseas Chinese and students from Hong Kong or Macau' },
    how: { zh: '海外聯招會個人申請、聯合分發，或義守單獨招生（116 學年度 30 系所、可填 3 志願、免申請費）。', en: 'Apply through the Overseas Chinese joint admission (individual or placement), or ISU’s own admission (30 programs for 2027, up to 3 choices, no fee).' },
    applyUrl: 'https://enroll.isu.edu.tw/DL/',
    infoUrl: 'https://www.isu.edu.tw/admissions/24?category=5&year=116',
    deadline: { zh: '116 單招報名 2026-10-12 至 12-15；結果通知後 2027-01-11 至 01-18 須網路報到（早於 2/16 放榜）', en: 'ISU admission for 2027: apply Oct 12 – Dec 15, 2026; confirm online Jan 11–18, 2027 (before the Feb 16 announcement)' },
    timeline: [
      { zh: '大一', en: 'Year 1' }, { zh: '大二', en: 'Year 2' }, { zh: '大三・實習', en: 'Year 3 · Internship' }, { zh: '大四・畢業', en: 'Year 4 · Graduate' },
    ],
    scholarship: { zh: '僑生及港澳生住宿獎助：每學期最高一學期住宿費（新生需出席率 70%、在國際處服務 20 小時）；另有教育部清寒僑生助學金、僑委會獎學金等。', en: 'Overseas Chinese housing award: up to one semester’s housing fee each term (new students need 70% attendance and 20 service hours). Plus MOE and Overseas Community Affairs Council scholarships.' },
    chinese: { zh: '以中文授課為主，也可選 4 個英語學士學程。', en: 'Mostly Chinese-taught, with four English-taught bachelor’s programs available too.' },
  },
};

// INTENSE 適用國家（ISO 代碼）
export const INTENSE_COUNTRIES = ['PH', 'IN', 'ID', 'VN', 'MY', 'TH'];

// 出發地。lat/lon 用首都附近位置，只決定地球上的起點。
export const COUNTRIES = [
  { code: 'VN', name: { zh: '越南', en: 'Vietnam', vi: 'Việt Nam' }, lat: 21.03, lon: 105.85 },
  { code: 'ID', name: { zh: '印尼', en: 'Indonesia' }, lat: -6.2, lon: 106.85 },
  { code: 'PH', name: { zh: '菲律賓', en: 'Philippines' }, lat: 14.6, lon: 120.98 },
  { code: 'TH', name: { zh: '泰國', en: 'Thailand' }, lat: 13.75, lon: 100.5 },
  { code: 'MY', name: { zh: '馬來西亞', en: 'Malaysia' }, lat: 3.14, lon: 101.69 },
  { code: 'IN', name: { zh: '印度', en: 'India' }, lat: 28.61, lon: 77.21 },
  { code: 'MM', name: { zh: '緬甸', en: 'Myanmar' }, lat: 16.84, lon: 96.17 },
  { code: 'KH', name: { zh: '柬埔寨', en: 'Cambodia' }, lat: 11.56, lon: 104.92 },
  { code: 'NP', name: { zh: '尼泊爾', en: 'Nepal' }, lat: 27.7, lon: 85.3 },
  { code: 'BD', name: { zh: '孟加拉', en: 'Bangladesh' }, lat: 23.81, lon: 90.41 },
  { code: 'MN', name: { zh: '蒙古', en: 'Mongolia' }, lat: 47.92, lon: 106.92 },
  { code: 'JP', name: { zh: '日本', en: 'Japan' }, lat: 35.68, lon: 139.69 },
  { code: 'KR', name: { zh: '韓國', en: 'Korea' }, lat: 37.57, lon: 126.98 },
  { code: 'HK', name: { zh: '香港', en: 'Hong Kong' }, lat: 22.32, lon: 114.17 },
  { code: 'MO', name: { zh: '澳門', en: 'Macau' }, lat: 22.2, lon: 113.54 },
  { code: 'SZ', name: { zh: '史瓦帝尼', en: 'Eswatini' }, lat: -26.32, lon: 31.13 },
  { code: 'US', name: { zh: '美國', en: 'United States' }, lat: 37.77, lon: -122.42 },
];

export const KAOHSIUNG = { lat: 22.63, lon: 120.3 };

// The expanded bilingual prelude lives in its own editable content file.
export { TAIWAN, KAOHSIUNG_STAGE, CAMPUS } from './prelude-content.js';

// 第二章：人生卡
export const LIFE_CARDS = [
  { id: 'stay', title: { zh: '在台灣工作的機會', en: 'A chance to build a career in Taiwan' }, scene: { zh: '在高雄的科技廊帶工作，週末去旗津看海。畢業後居留證可延長找工作，留台採評點制。', en: 'working in Kaohsiung’s tech corridor, weekends by the sea in Cijin. After graduating you can extend your residence to job-hunt.' } },
  { id: 'home', title: { zh: '回家鄉創業的本事', en: 'Skills to start something back home' }, scene: { zh: '帶著在台灣學到的技術與人脈，回家鄉開自己的公司。', en: 'back home, running your own company with the skills and network you built in Taiwan.' } },
  { id: 'bridge', title: { zh: '成為兩地橋梁的能力', en: 'The ability to bridge two places' }, scene: { zh: '說兩種語言，往返兩個國家，讓兩邊的合作因你發生。', en: 'speaking two languages, flying between two countries, making things happen between them.' } },
  { id: 'love', title: { zh: '一段珍貴的相遇', en: 'Meaningful friendships and encounters' }, scene: { zh: '和在社團認識的那個人，一起在愛河邊看夕陽。', en: 'watching the sunset over Love River with the person you met in a student club.' } },
  { id: 'unsure', title: { zh: '還不確定', en: 'Not sure yet' }, scene: { zh: '還在探索，但已經知道自己能去很多地方。', en: 'still exploring — and knowing how many doors are open.' } },
];

// 第三章：三個問題
export const QUESTIONS = [
  { id: 'route', title: { zh: '你偏好的學習路徑？', en: 'Which study route interests you?' }, options: [
    { id: 'degree', label: { zh: '直接讀專業科系', en: 'Go straight into a degree' } },
    { id: 'mandarin', label: { zh: '先學中文 · 國際專修部', en: 'Mandarin first · IFP' } },
    { id: 'industry', label: { zh: '企業合作 · INTENSE', en: 'Industry partnership · INTENSE' } },
  ] },
  {
    id: 'edu',
    title: { zh: '你現在的學歷？', en: 'Your current education?' },
    options: [
      { id: 'hs', label: { zh: '高中（即將）畢業', en: 'Finishing / finished high school' } },
      { id: 'college', label: { zh: '專科 D3', en: 'Diploma (D3)' } },
      { id: 'bachelor', label: { zh: '學士 D4／S1（含應屆）', en: 'Bachelor’s D4 / S1 (including graduands)' } },
      { id: 'master', label: { zh: '碩士（S2）', en: 'Master’s degree (S2)' } },
    ],
  },
  {
    id: 'lang',
    title: { zh: '你的語言？', en: 'Your languages?' },
    options: [
      { id: 'zh', label: { zh: '中文可以上課（TOCFL A2 以上）', en: 'I can study in Chinese (TOCFL A2+)' } },
      { id: 'en', label: { zh: '英文較好（CEFR B1 以上），中文還不行', en: 'English is stronger (CEFR B1+), no Chinese yet' } },
      { id: 'none', label: { zh: '兩種都還不太行', en: 'Neither is strong yet' } },
    ],
  },
  {
    id: 'bg',
    title: { zh: '你的背景？', en: 'Your background?' },
    options: [
      { id: 'none', label: { zh: '其他（例如：美國、泰國、越南、印尼等）', en: 'Others (e.g. USA, Thailand, Vietnam, Indonesia, etc.)' } },
      { id: 'oc', label: { zh: '華裔僑生，或香港、澳門學生', en: 'Overseas Chinese, or from Hong Kong / Macau' } },
      { id: 'tw', label: { zh: '以前在台灣讀書或工作過', en: 'I’ve studied or worked in Taiwan before' } },
    ],
  },
];

// 第四章：七座島。programs.bridges 列出可以到達的橋。
// fee＝每學期學雜費（2026 年度會計處收費表），campus：main 校本部 / medical 醫學院區。
export const ISLANDS = [
  {
    id: 'chip', photo: 'assets/photos/computer-lab.webp', color: '#7FB7E6', accent: '#2F6FA8',
    name: { zh: '晶片島', en: 'Chip Isle' },
    career: { zh: '造晶片的人', en: 'Chip maker' },
    industry: { zh: '半導體', en: 'Semiconductors' },
    landmark: { zh: '半導體先進製程虛實場域；碼頭的飛船開往日月光高雄廠。', en: 'A semiconductor process lab; airships at the dock fly to ASE’s Kaohsiung plant.' },
    role: { zh: '在晶圓廠調校製程的工程師', en: 'a process engineer tuning chips in a wafer fab' },
    day: [
      { zh: '早上在無塵室穿上兔寶寶裝', en: 'Morning: suit up for the cleanroom' },
      { zh: '下午在虛實場域模擬晶圓製程', en: 'Afternoon: simulate wafer processes in the lab' },
      { zh: '傍晚和同學在義大世界吃晚餐', en: 'Evening: dinner with classmates at E-Da World' },
    ],
    milestone: { zh: '半導體廠實習', en: 'Internship at a chip plant' },
    programs: [
      { id: 'sdpg', name: { zh: '半導體學士學位學程', en: 'Semiconductor Degree Program' }, url: 'https://sdpg.isu.edu.tw/en-US', bridges: ['zh', 'ifp'], lang: 'zh', campus: 'main', fee: 55373, focus: { zh: '半導體材料、製程、IC 封裝與智慧製造', en: 'Materials, processes, IC packaging, smart manufacturing' } },
      { id: 'ene', name: { zh: '電子工程學系', en: 'Dept. of Electronic Engineering' }, url: 'https://ene.isu.edu.tw/en-US', bridges: ['zh', 'ifp', 'oc'], lang: 'zh', campus: 'main', fee: 55373, focus: { zh: '光電半導體、電子智慧系統', en: 'Optoelectronics, semiconductors, smart electronics' } },
      { id: 'ee', name: { zh: '電機工程學系', en: 'Dept. of Electrical Engineering' }, url: 'https://ee.isu.edu.tw/en-US', bridges: ['zh', 'ifp', 'oc'], lang: 'zh', campus: 'main', fee: 55373, focus: { zh: '通訊光電、智慧控制、能源與系統', en: 'Communications, smart control, energy systems' } },
      { id: 'mse', name: { zh: '材料科學與工程學系', en: 'Dept. of Materials Science and Engineering' }, url: 'https://mse.isu.edu.tw/en-US', bridges: ['zh', 'ifp', 'oc'], lang: 'zh', campus: 'main', fee: 55373, focus: { zh: '金屬、電子光電與多功能材料', en: 'Metals, electronic and functional materials' } },
      { id: 'che', name: { zh: '化學工程學系', en: 'Dept. of Chemical Engineering' }, url: 'https://che.isu.edu.tw/en-US', bridges: ['zh', 'ifp', 'oc'], lang: 'zh', campus: 'main', fee: 55373, focus: { zh: '化工製程、生物技術、綠色能源', en: 'Chemical processes, biotech, green energy' } },
      { id: 'equip', name: { zh: 'INTENSE 學士後設備工程二年制學士專班', en: 'INTENSE · Post-Baccalaureate Equipment Engineering' }, url: 'https://ee.isu.edu.tw/en-US', bridges: ['intense'], lang: 'en', campus: 'main', fee: null, level: 'intense', focus: { zh: '2027 春季班：全英語授課，設備技術與企業實習', en: 'Spring 2027: English-taught equipment technology and company internship' } },
    ],
  },
  {
    id: 'code', photo: 'assets/photos/ai-lab.webp', color: '#9C8FE0', accent: '#5B4BB5',
    name: { zh: '程式島', en: 'Code Isle' },
    career: { zh: '寫程式、做 AI 的人', en: 'Coder & AI builder' },
    industry: { zh: '資訊與 AI', en: 'Software & AI' },
    landmark: { zh: 'NVIDIA 超級電腦與智慧科技創新中心。', en: 'An NVIDIA supercomputer and the Intelligent Technology Innovation Center.' },
    role: { zh: '訓練 AI 模型的軟體工程師', en: 'a software engineer training AI models' },
    day: [
      { zh: '早上在 AI 高效能運算實驗室跑模型', en: 'Morning: train models in the AI computing lab' },
      { zh: '下午和機器人一起做專題', en: 'Afternoon: build a project with robots' },
      { zh: '晚上參加駭客松社團', en: 'Night: hackathon club' },
    ],
    milestone: { zh: 'AI 專題與科技公司實習', en: 'AI project and tech internship' },
    programs: [
      { id: 'csie', name: { zh: '資訊工程學系', en: 'Dept. of Information Engineering' }, url: 'https://csie.isu.edu.tw/en-US', bridges: ['zh', 'ifp', 'oc'], lang: 'zh', campus: 'main', fee: 55373, focus: { zh: 'AI 多媒體、雲端物聯網、資安', en: 'AI multimedia, cloud & IoT, cybersecurity' } },
      { id: 'mis', name: { zh: '資訊管理學系', en: 'Dept. of Information Management' }, url: 'https://mis.isu.edu.tw/en-US', bridges: ['zh', 'ifp', 'oc'], lang: 'zh', campus: 'main', fee: 47994, focus: { zh: 'AI 應用、電子商務、數據與雲端', en: 'Applied AI, e-commerce, data & cloud' } },
      { id: 'ipai', name: { zh: '智慧科技英語學士學位學程', en: 'International Program on AI Technology' }, url: 'https://ipai.isu.edu.tw/en-US', bridges: ['en'], lang: 'en', campus: 'main', fee: 72500, focus: { zh: 'AI、大數據、物聯網、機器人，全英語授課', en: 'AI, big data, IoT and robotics, taught in English' } },
    ],
  },
  {
    id: 'maker', photo: 'assets/photos/ai-center.webp', color: '#E8B26A', accent: '#A86A1E',
    name: { zh: '工匠島', en: 'Maker Isle' },
    career: { zh: '造機器、蓋城市的人', en: 'Machine & city builder' },
    industry: { zh: '智慧製造、營建', en: 'Smart manufacturing & construction' },
    landmark: { zh: '智慧設計與製造中心的機器手臂與 3D 列印。', en: 'Robot arms and 3D printers in the Smart Design & Manufacturing Center.' },
    role: { zh: '設計自動化產線或城市建築的工程師', en: 'an engineer designing automated factories or city buildings' },
    day: [
      { zh: '早上在工廠實驗室操作機器手臂', en: 'Morning: program a robot arm' },
      { zh: '下午做結構模型與防災實驗', en: 'Afternoon: test structures and quake safety' },
      { zh: '傍晚在觀音山步道散步', en: 'Evening: walk the Guanyin Mountain trail' },
    ],
    milestone: { zh: '工廠或營建工地實習', en: 'Factory or construction-site internship' },
    programs: [
      { id: 'mae', name: { zh: '機械與自動化工程學系', en: 'Dept. of Mechanical and Automation Engineering' }, url: 'https://mae.isu.edu.tw/en-US', bridges: ['zh', 'ifp', 'oc'], lang: 'zh', campus: 'main', fee: 55373, focus: { zh: '機電整合、智慧製造、3D 列印', en: 'Mechatronics, smart manufacturing, 3D printing' } },
      { id: 'civil', name: { zh: '土木工程學系', en: 'Dept. of Civil Engineering' }, url: 'https://civil.isu.edu.tw/en-US', bridges: ['zh', 'ifp', 'oc'], lang: 'zh', campus: 'main', fee: 55373, focus: { zh: '結構營建、防災、永續與數位工程', en: 'Structures, disaster resilience, digital construction' } },
      { id: 'intense-mae', name: { zh: 'INTENSE 機械與自動化工程二年制學士專班', en: 'INTENSE · Mechanical and Automation Engineering' }, url: 'https://mae.isu.edu.tw/en-US', bridges: ['intense'], lang: 'zh', campus: 'main', fee: null, level: 'intense', focus: { zh: '2027 春季班：中文授課（TOCFL A2 以上），1 年在校＋1 年企業實習', en: 'Spring 2027: Chinese-taught (TOCFL A2+), one year on campus plus one year of company internship' } },
    ],
  },
  {
    id: 'health', photo: 'assets/photos/campus-medical.webp', color: '#8FD0B0', accent: '#2E8A63',
    name: { zh: '健康島', en: 'Health Isle' },
    career: { zh: '守護健康的人', en: 'Health guardian' },
    industry: { zh: '醫療照護、長照、營養、醫療科技', en: 'Healthcare, elder care, nutrition, med-tech' },
    landmark: { zh: '燕巢醫學院區的智慧醫療教學中心，隔壁就是義大醫院。', en: 'The smart-healthcare simulation center in Yanchao, next to E-Da Hospital.' },
    role: { zh: '在醫院或長照機構守護病人的專業人員', en: 'a health professional caring for patients' },
    day: [
      { zh: '早上在模擬病房練習臨床技能', en: 'Morning: practise clinical skills on the simulation ward' },
      { zh: '下午在生醫實驗室做檢驗', en: 'Afternoon: run tests in the biomedical lab' },
      { zh: '傍晚到義大醫院見習', en: 'Evening: shadow staff at E-Da Hospital' },
    ],
    milestone: { zh: '醫院臨床實習', en: 'Clinical placement in hospital' },
    programs: [
      { id: 'nurse', name: { zh: '護理學系', en: 'Dept. of Nursing' }, url: 'https://nurse.isu.edu.tw/en-US', bridges: ['zh', 'ifp', 'oc'], lang: 'zh', campus: 'medical', fee: 55495, focus: { zh: '臨床護理、健康促進，須完成台灣臨床實習', en: 'Clinical nursing and health promotion, with Taiwan clinical placements' } },
      { id: 'bme', name: { zh: '生物醫學工程學系', en: 'Dept. of Biomedical Engineering' }, url: 'https://bme.isu.edu.tw/en-US', bridges: ['zh', 'ifp', 'oc'], lang: 'zh', campus: 'medical', fee: 55495, focus: { zh: '生醫電子、生醫材料、組織工程', en: 'Biomedical electronics, biomaterials, tissue engineering' } },
      { id: 'pt', name: { zh: '物理治療學系', en: 'Dept. of Physical Therapy' }, url: 'https://pt.isu.edu.tw/en-US', bridges: ['zh', 'oc'], lang: 'zh', campus: 'medical', fee: 55495, focus: { zh: '物理治療、長照與運動復健', en: 'Physical therapy, elder care, sports rehab' } },
      { id: 'ot', name: { zh: '職能治療學系', en: 'Dept. of Occupational Therapy' }, url: 'https://ot.isu.edu.tw/en-US', bridges: ['zh', 'oc'], lang: 'zh', campus: 'medical', fee: 55495, focus: { zh: '兒童、成人、心理與社區職能', en: 'Pediatric, adult, mental-health and community OT' } },
      { id: 'nut', name: { zh: '營養學系', en: 'Dept. of Nutrition' }, url: 'https://nut.isu.edu.tw/en-US', bridges: ['zh', 'oc'], lang: 'zh', campus: 'medical', fee: 55495, focus: { zh: '臨床營養、食品營養、團膳', en: 'Clinical and food nutrition, food service' } },
      { id: 'healthcare', name: { zh: '醫務管理學系', en: 'Dept. of Healthcare Administration' }, url: 'https://healthcare.isu.edu.tw/en-US', bridges: ['zh', 'oc'], lang: 'zh', campus: 'medical', fee: 47994, focus: { zh: '醫療機構與高齡產業管理、智慧醫療', en: 'Hospital and senior-care management, smart health' } },
      { id: 'bst', name: { zh: '醫學科學與生物科技學系', en: 'Dept. of Medical Science and Biotechnology' }, url: 'https://bst.isu.edu.tw/en-US', bridges: ['zh', 'oc'], lang: 'zh', campus: 'medical', fee: 55495, focus: { zh: '醫學科學、細胞與基因、生物科技', en: 'Medical science, cells & genes, biotech' } },
      { id: 'rt', name: { zh: '醫學影像暨放射科學系', en: 'Dept. of Medical Imaging and Radiological Sciences' }, url: 'https://rt.isu.edu.tw/en-US', bridges: ['zh', 'oc'], lang: 'zh', campus: 'medical', fee: 55495, focus: { zh: '醫學影像、放射診斷與治療', en: 'Medical imaging, radiology and radiotherapy' } },
      { id: 'mls', name: { zh: '醫學檢驗技術學系', en: 'Dept. of Medical Laboratory Science' }, url: 'https://mls.isu.edu.tw/en-US', bridges: ['zh', 'oc'], lang: 'zh', campus: 'medical', fee: 55495, focus: { zh: '臨床檢驗與實驗室實務', en: 'Clinical testing and lab practice' } },
      { id: 'scm', name: { zh: '學士後中醫學系', en: 'School of Chinese Medicine for Post Baccalaureate' }, url: 'https://scmpb.isu.edu.tw/en-US', bridges: ['zh'], lang: 'zh', campus: 'medical', fee: null, level: 'postbac', focus: { zh: '已有學士學位者的五年制中醫專業養成；另有先修科目與審查要求', en: 'A five-year Chinese medicine program for degree holders, with prerequisite and admissions requirements' } },
    ],
  },
  {
    id: 'leisure', photo: 'assets/photos/culinary.webp', color: '#F2A07B', accent: '#C2552E',
    name: { zh: '遊憩島', en: 'Leisure Isle' },
    career: { zh: '讓人吃好、住好、玩好的人', en: 'Host of great food, stays & fun' },
    industry: { zh: '觀光、餐旅、廚藝、休閒產業', en: 'Tourism, hospitality, culinary, leisure' },
    landmark: { zh: 'ISU Cooking Library 開放式廚房與義大世界的摩天輪；義聯集團旗下有高雄萬豪酒店、義大皇家酒店與義大遊樂世界。', en: 'The ISU Cooking Library kitchen and E-Da World’s Ferris wheel — and the E-United Group runs Marriott Kaohsiung, E-Da Royal Hotel and E-Da Theme Park.' },
    role: { zh: '經營飯店、餐廳或旅遊體驗的人', en: 'someone running hotels, restaurants or travel experiences' },
    day: [
      { zh: '早上在 Cooking Library 學一道新菜', en: 'Morning: master a new dish in the Cooking Library' },
      { zh: '下午練習飯店大廳與高級管家服務', en: 'Afternoon: practise front desk and butler service' },
      { zh: '晚上逛六合夜市找靈感', en: 'Night: find inspiration at Liuhe Night Market' },
    ],
    milestone: { zh: '飯店或餐廳校外實習', en: 'Hotel or restaurant internship' },
    programs: [
      { id: 'hm', name: { zh: '餐旅管理學系', en: 'Dept. of Hospitality Management' }, url: 'https://hm.isu.edu.tw/en-US', bridges: ['zh', 'ifp', 'oc'], lang: 'zh', campus: 'main', fee: 47994, focus: { zh: '餐飲與旅館經營，須校外實習，設高級管家服務學程', en: 'Hotel & restaurant management with internships and a butler-service track' } },
      { id: 'ca', name: { zh: '廚藝暨美食學學系', en: 'Dept. of Culinary Arts and Gastronomy' }, url: 'https://ca.isu.edu.tw/en-US', bridges: ['zh', 'ifp', 'oc'], lang: 'zh', campus: 'main', fee: 55373, focus: { zh: '廚藝技術、廚務管理、健康飲食，須校外實習', en: 'Culinary skills, kitchen management, healthy cuisine, with internships' } },
      { id: 'icth', name: { zh: '智慧觀光餐旅管理英語學士學位學程', en: 'Program in Intelligent Tourism and Hospitality Management' }, url: 'https://icth.isu.edu.tw/en-US', bridges: ['en', 'oc'], lang: 'en', campus: 'main', fee: 72500, focus: { zh: '觀光餐旅、智慧服務，全英語授課', en: 'Tourism, hospitality and smart service, taught in English' } },
    ],
  },
  {
    id: 'story', photo: 'assets/photos/new-media.webp', color: '#E59BC0', accent: '#A8457A',
    name: { zh: '故事島', en: 'Story Isle' },
    career: { zh: '說故事、創作內容的人', en: 'Storyteller & creator' },
    industry: { zh: '影視、傳播、設計與數位內容', en: 'Film, media, design & digital content' },
    landmark: { zh: '攝影棚、元宇宙科技藝術設計中心；傳送門通往電影系課程島。', en: 'Film studios and the Metaverse Art & Design Center — with a portal to the Film Department’s course island.' },
    role: { zh: '拍電影、做節目或設計數位內容的創作者', en: 'a creator making films, shows or digital design' },
    day: [
      { zh: '早上在攝影棚架燈、試拍', en: 'Morning: light and test a scene in the studio' },
      { zh: '下午用虛擬製作做特效', en: 'Afternoon: create effects with virtual production' },
      { zh: '晚上到駁二看展、拍素材', en: 'Night: exhibitions and shooting at Pier-2' },
    ],
    milestone: { zh: '影視公司或媒體實習', en: 'Studio or media internship' },
    programs: [
      { id: 'imem', name: { zh: '國際傳媒與娛樂管理英語學士學位學程', en: 'Program in International Media and Entertainment Management' }, url: 'https://imem.isu.edu.tw/en-US', bridges: ['en', 'oc'], lang: 'en', campus: 'main', fee: 72500, focus: { zh: '影視娛樂、活動策展、數位行銷，全英語授課', en: 'Entertainment, events and digital marketing, taught in English' } },
      { id: 'filmtv', name: { zh: '電影與電視學系', en: 'Dept. of Film and TV' }, url: 'https://filmtv.isu.edu.tw/en-US', bridges: ['zh', 'oc'], lang: 'zh', campus: 'main', fee: 55373, focus: { zh: '劇情片、編導、攝影燈光、虛擬製作', en: 'Narrative film, directing, cinematography, virtual production' } },
      { id: 'dmc', name: { zh: '大眾傳播學系', en: 'Dept. of Mass Communication' }, url: 'https://dmc.isu.edu.tw/en-US', bridges: ['zh', 'oc'], lang: 'zh', campus: 'main', fee: 55373, focus: { zh: '全媒體敘事、內容產製、廣告公關', en: 'Cross-media storytelling, content, advertising & PR' } },
      { id: 'dvad', name: { zh: '視覺藝術與設計學系', en: 'Dept. of Visual Arts and Design' }, url: 'https://dvad.isu.edu.tw/en-US', bridges: ['zh', 'oc'], lang: 'zh', campus: 'main', fee: 55373, focus: { zh: '視覺創作、科技藝術、互動設計', en: 'Visual art, tech art, interactive design' } },
      { id: 'ccd', name: { zh: '文創傳播與設計碩士班', en: 'Master Program of Cultural Creative Communication and Design' }, url: 'https://mccd.isu.edu.tw/en-US', bridges: ['zh'], lang: 'zh', campus: 'main', fee: null, level: 'master', focus: { zh: '文化創意、傳播設計與跨域研究', en: 'Cultural creativity, communication, design and interdisciplinary research' } },
    ],
  },
  {
    id: 'business', photo: 'assets/photos/business.webp', color: '#B9C77A', accent: '#6E7E2C',
    name: { zh: '企業島', en: 'Business Isle' },
    career: { zh: '經營企業、做跨國生意的人', en: 'Business leader & global trader' },
    industry: { zh: '企業管理、金融、會計、國際貿易', en: 'Management, finance, accounting, trade' },
    landmark: { zh: '企業總部大樓與交易大廳；AACSB 認證的商管學院。', en: 'Headquarters towers and a trading floor — at AACSB-accredited business colleges.' },
    role: { zh: '在跨國企業做決策的經理人', en: 'a manager making decisions at a global company' },
    day: [
      { zh: '早上用英文做個案討論', en: 'Morning: case discussion in English' },
      { zh: '下午在金融實驗室看即時盤勢', en: 'Afternoon: watch live markets in the finance lab' },
      { zh: '晚上和來自世界各地的同學做專題', en: 'Night: team project with classmates from many countries' },
    ],
    milestone: { zh: '跨國企業或金融業實習', en: 'Internship at a global firm' },
    programs: [
      { id: 'iciba', name: { zh: '國際企業經營英語學士學位學程', en: 'Program in International Business Administration' }, url: 'https://iciba.isu.edu.tw/en-US', bridges: ['en', 'oc'], lang: 'en', campus: 'main', fee: 72500, focus: { zh: '國際企業、行銷與跨文化管理，全英語', en: 'Global business, marketing and cross-cultural management' } },
      { id: 'icfa', name: { zh: '財務與商業分析英語學士學位學程', en: 'Program in Finance and Business Analytics' }, url: 'https://icfa.isu.edu.tw/en-US', bridges: ['en', 'oc'], lang: 'en', campus: 'main', fee: 72500, focus: { zh: '財務、商業分析、金融科技，全英語', en: 'Finance, business analytics and fintech' } },
      { id: 'imba', name: { zh: '國際管理碩士班 IMBA', en: 'International MBA (IMBA)' }, url: 'https://imba.isu.edu.tw/en-US', bridges: ['en'], lang: 'en', campus: 'main', fee: 0, level: 'master', focus: { zh: '英語授課的管理碩士', en: 'An English-taught master’s in management' } },
      { id: 'ba', name: { zh: '企業管理學系', en: 'Dept. of Business Administration' }, url: 'https://ba.isu.edu.tw/en-US', bridges: ['zh', 'oc'], lang: 'zh', campus: 'main', fee: 47994, focus: { zh: '企業經營、行銷、AI 創新與創業', en: 'Management, marketing, AI innovation, startups' } },
      { id: 'finance', name: { zh: '財務金融管理學系', en: 'Dept. of Finance' }, url: 'https://finance.isu.edu.tw/en-US', bridges: ['zh', 'oc'], lang: 'zh', campus: 'main', fee: 47994, focus: { zh: '企業財務、金融科技與資料分析', en: 'Corporate finance, fintech, data analysis' } },
      { id: 'acc', name: { zh: '會計學系', en: 'Dept. of Accounting' }, url: 'https://acc.isu.edu.tw/en-US', bridges: ['zh', 'oc'], lang: 'zh', campus: 'main', fee: 47994, focus: { zh: '會計、審計、稅務、永續碳管理', en: 'Accounting, auditing, tax, carbon management' } },
      { id: 'aj', name: { zh: '應用日語學系', en: 'Dept. of Applied Japanese' }, url: 'https://aj.isu.edu.tw/en-US', bridges: ['zh', 'oc'], lang: 'zh', campus: 'main', fee: 47994, focus: { zh: '日語、日本商業貿易與跨文化', en: 'Japanese language, trade and culture' } },
      { id: 'management-phd', name: { zh: '管理博士班', en: 'PhD Program in Management' }, url: 'https://gsm.isu.edu.tw/en-US', bridges: ['zh'], lang: 'zh', campus: 'main', fee: null, level: 'phd', focus: { zh: '管理組與工業管理組，以研究方法與博士論文為主軸', en: 'Management and industrial management tracks, centred on research methods and a doctoral dissertation' } },
    ],
  },
];

export const DORM = {
  title: { zh: '宿舍', en: 'Dorms' },
  rooms: [
    { name: { zh: '校本部第一宿舍・三人房', en: 'Main campus Dorm 1 · triple' }, price: { zh: '每學期 NT$18,500，寒暑假關閉', en: 'NT$18,500 per semester, closed in breaks' } },
    { name: { zh: '校本部第二宿舍・雙人房', en: 'Main campus Dorm 2 · twin' }, price: { zh: '每月 NT$4,290，房內衛浴，寒暑假開放', en: 'NT$4,290 per month, private bathroom, open all year' } },
    { name: { zh: '醫學院區宿舍・三人房', en: 'Medical campus · triple' }, price: { zh: '每學期 NT$17,500', en: 'NT$17,500 per semester' } },
  ],
  notes: [
    { zh: '生活費每月約 NT$6,000–10,000；抵台第一個月建議另備 NT$20,000。', en: 'Living costs run about NT$6,000–10,000 a month; bring NT$20,000 extra for your first month.' },
    { zh: '取得居留證與工作許可後可以打工：學期中每週最多 20 小時，寒暑假不限。', en: 'With your residence card and a work permit, work up to 20 hours a week during term, unlimited in breaks.' },
    { zh: '宿舍沒有門禁時間；禁止開伙。', en: 'No curfew in the dorms; cooking in rooms isn’t allowed.' },
  ],
  url: 'https://sa1.isu.edu.tw/storage/files/fZu45fLWBb58INwMtcGUqfCB8nECtFoPYoQWpaLS.pdf',
};

// 華語塔：每一層一句簡單中文
export const MANDARIN_TOWER = [
  { level: 'A2', phrase: '你好，我是新同學。', pinyin: 'Nǐ hǎo, wǒ shì xīn tóngxué.', meaning: { zh: '基礎：自我介紹', en: 'A2 · Hello, I’m a new classmate.' } },
  { level: 'B1', phrase: '這堂課很有趣，我想多學一點。', pinyin: 'Zhè táng kè hěn yǒuqù, wǒ xiǎng duō xué yìdiǎn.', meaning: { zh: '進階：表達想法', en: 'B1 · This class is fun — I want to learn more.' } },
  { level: '★', phrase: '謝謝台灣，我畢業了！', pinyin: 'Xièxie Táiwān, wǒ bìyè le!', meaning: { zh: '畢業：說出你的故事', en: 'Graduation · Thank you, Taiwan — I graduated!' } },
];

// 介面文字
export const UI = {
  title: { zh: '空中群島', en: 'Islands in the Sky' },
  subtitle: { zh: '你在台灣的未來，從這裡起飛', en: 'Your future in Taiwan takes off here' },
  school: { zh: '義守大學', en: 'I-Shou University' },
  start: { zh: '開始旅程', en: 'Begin the journey' },
  minutes: { zh: '約 5 分鐘', en: 'About 5 minutes' },
  continue: { zh: '繼續', en: 'Continue' },
  back: { zh: '返回', en: 'Back' },
  close: { zh: '關閉', en: 'Close' },
  skip: { zh: '略過', en: 'Skip' },
  chapters: [
    { zh: '啟程', en: 'Depart' }, { zh: '生活與學習', en: 'Life & learning' }, { zh: '入學橋', en: 'Bridge' }, { zh: '課程', en: 'Programs' }, { zh: '定錨', en: 'Anchor' },
  ],
  whereFrom: { zh: '你從哪裡來？', en: 'Where are you from?' },
  whereFromHint: { zh: '選一個國家，或直接點地球上的位置', en: 'Pick a country, or tap anywhere on the globe' },
  otherPlace: { zh: '在地球上選位置', en: 'Somewhere else' },
  tapToExplore: { zh: '點一下看看', en: 'Tap to explore' },
  narr1: { zh: '這些島，是你可能的未來。', en: 'These islands are your possible futures.' },
  futureTitle: { zh:'選一座學習島，先看看裡面有哪些科系。找到喜歡的方向後，再來認識你的出發點與入學橋。', en:'Choose a field of study and preview its programs. Then explore your starting point and admission bridge.' },
  learningPick: { zh:'想探索哪一種學習？', en:'What would you like to learn?' },
  lifePick: { zh: '你想在台灣得到什麼？', en: 'What do you hope to gain in Taiwan?' },
  bridgeTitle: { zh:'從你的出發點，找到入學橋', en:'Find a bridge from your starting point' },
  yourBridge: { zh: '你的橋', en: 'Your bridge' },
  otherBridges: { zh: '其他可能的路', en: 'Other paths' },
  needLanguage: { zh: '目前語言能力尚未符合直接入學的初步條件，可先了解華語中心或準備語言證明；完成一門語言課並不保證達到入學門檻。', en: 'Explore language support and prepare the required evidence before direct entry. A language course does not guarantee admission proficiency.' },
  languageCenterUrl: 'https://international.isu.edu.tw/learning-chinese/',
  islandsTitle: { zh: '群島探索', en: 'Explore the islands' },
  islandsHint: { zh: '進島就能選科系。亮色與亮燈代表初步相符；灰階代表目前條件不同，仍可點開比較。', en: 'Choose a program as soon as you land. Bright, lit buildings mark an initial match. Grey buildings have different conditions and remain open for exploration.' },
  firstStop: { zh:'你想學的領域', en:'Your field of interest' },
  stationDay: { zh: '一天', en: 'A day' },
  stationYears: { zh: '四年', en: 'Four years' },
  stationFuture: { zh:'未來方向', en:'Possible futures' },
  badge: { zh: '獲得島嶼徽章', en: 'Island badge earned' },
  plantFlag: { zh:'確認科系，定錨', en:'Anchor this program' },
  choosePrograms: { zh: '選一個系所插旗', en: 'Choose a program for your flag' },
  reachable: { zh: '你的橋可以到', en: 'Your bridge reaches it' },
  needOtherBridge: { zh: '要走另一座橋：', en: 'Needs another bridge: ' },
  visitSite: { zh: '系所網站', en: 'Program site' },
  perSemester: { zh: '每學期學雜費', en: 'Per-semester fees' },
  mainCampus: { zh: '校本部', en: 'Main campus' },
  medicalCampus: { zh: '醫學院區', en: 'Medical campus' },
  taughtIn: { zh: '授課', en: 'Taught in' },
  langZh: { zh: '中文', en: 'Chinese' },
  langEn: { zh: '英文', en: 'English' },
  masters: { zh: '碩士班', en: 'Master’s' },
  backToIslands: { zh: '回到群島', en: 'Back to the islands' },
  support: { zh: '支援', en: 'Support' },
  scholarship: { zh: '獎學金', en: 'Scholarships' },
  dorm: { zh: '宿舍', en: 'Dorms' },
  tower: { zh: '華語塔', en: 'Mandarin Tower' },
  more: { zh: '看更多', en: 'More details' },
  routeTitle: { zh: '你的路線卡', en: 'Your route card' },
  yourName: { zh: '你的名字（可不填）', en: 'Your name (optional)' },
  share: { zh: '分享路線卡', en: 'Share my route' },
  download: { zh: '下載圖片', en: 'Download image' },
  apply: { zh: '前往申請', en: 'Apply now' },
  ask: { zh: '問一個真人', en: 'Ask a real person' },
  replay: { zh:'再探索另一個學習方向', en:'Explore another field' },
  learnMore: { zh: '了解更多', en: 'Learn more' },
  routeFrom: { zh: '從', en: 'From' },
  routeTo: { zh: '飛向高雄', en: 'to Kaohsiung' },
  future: { zh: '未來', en: 'Future' },
  life: { zh: '我想得到', en: 'I hope to gain' },
  program: { zh: '系所', en: 'Program' },
  timeline: { zh: '時間線', en: 'Timeline' },
  askSubject: { zh: '我的空中群島路線卡', en: 'My Islands in the Sky route' },
  askBody: { zh: '您好，我想進一步了解以下路線：', en: 'Hello, I’d like to learn more about this route:' },
  soundOn: { zh: '背景音樂', en: 'Music' },
  lowPower: { zh: '省電模式', en: 'Lite mode' },
  footer: { zh: '資料以當年度簡章與官方公告為準', en: 'Official prospectuses and notices prevail' },
  you: { zh:'小雲', en:'Cloudlet' },
  lookTitle: { zh:'選一位雲朵旅伴', en:'Choose your cloud companion' },
  skin: { zh:'雲朵', en:'Cloud' },
  outfit: { zh:'領巾', en:'Scarf' },
  becameStudent: { zh: '你成為義守的學生了！', en: 'You’re an I-Shou student now!' },
  graduated: { zh: '畢業了！', en: 'You graduated!' },
  tw: { zh: '台灣', en: 'Taiwan' },
  khh: { zh: '高雄', en: 'Kaohsiung' },
  guanyin: { zh: '觀音山', en: 'Guanyin Mtn.' },
};
