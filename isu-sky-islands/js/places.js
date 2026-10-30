// Typed hometowns. A small offline gazetteer: countries (ISO code, Chinese, English, capital-area lat/lon,
// extra spellings) and a few cities students often type. Anything unrecognised starts at sea instead.
import { COUNTRIES } from './content.js';

const C = [
  // Asia
  ['VN', '越南', 'Vietnam', 21.03, 105.85, 'viet nam;việt nam'], ['ID', '印尼', 'Indonesia', -6.2, 106.85, '印度尼西亞;印度尼西亚'],
  ['PH', '菲律賓', 'Philippines', 14.6, 120.98, 'pilipinas;philippine'], ['TH', '泰國', 'Thailand', 13.75, 100.5, 'thai;ประเทศไทย'],
  ['MY', '馬來西亞', 'Malaysia', 3.14, 101.69, '大馬'], ['IN', '印度', 'India', 28.61, 77.21, 'bharat'],
  ['MM', '緬甸', 'Myanmar', 16.84, 96.17, 'burma'], ['KH', '柬埔寨', 'Cambodia', 11.56, 104.92, 'kampuchea'],
  ['LA', '寮國', 'Laos', 17.97, 102.6, '老撾;老挝;lao'], ['SG', '新加坡', 'Singapore', 1.35, 103.82, ''],
  ['BN', '汶萊', 'Brunei', 4.9, 114.94, '文萊'], ['TL', '東帝汶', 'Timor-Leste', -8.56, 125.57, 'east timor'],
  ['NP', '尼泊爾', 'Nepal', 27.7, 85.3, ''], ['BD', '孟加拉', 'Bangladesh', 23.81, 90.41, ''],
  ['LK', '斯里蘭卡', 'Sri Lanka', 6.93, 79.85, ''], ['PK', '巴基斯坦', 'Pakistan', 33.69, 73.04, ''],
  ['BT', '不丹', 'Bhutan', 27.47, 89.64, ''], ['MV', '馬爾地夫', 'Maldives', 4.18, 73.51, '馬爾代夫'],
  ['AF', '阿富汗', 'Afghanistan', 34.53, 69.17, ''], ['MN', '蒙古', 'Mongolia', 47.92, 106.92, ''],
  ['JP', '日本', 'Japan', 35.68, 139.69, 'nihon;nippon'], ['KR', '韓國', 'Korea', 37.57, 126.98, 'south korea;南韓;대한민국;한국'],
  ['CN', '中國', 'China', 39.9, 116.4, '中國大陸;大陸;中华人民共和国'], ['HK', '香港', 'Hong Kong', 22.32, 114.17, ''],
  ['MO', '澳門', 'Macau', 22.2, 113.54, 'macao'], ['TW', '台灣', 'Taiwan', 25.03, 121.56, '臺灣'],
  ['KZ', '哈薩克', 'Kazakhstan', 51.17, 71.45, ''], ['UZ', '烏茲別克', 'Uzbekistan', 41.3, 69.24, ''],
  ['KG', '吉爾吉斯', 'Kyrgyzstan', 42.87, 74.59, ''], ['TJ', '塔吉克', 'Tajikistan', 38.56, 68.79, ''],
  ['TM', '土庫曼', 'Turkmenistan', 37.95, 58.38, ''], ['IR', '伊朗', 'Iran', 35.69, 51.39, ''],
  ['IQ', '伊拉克', 'Iraq', 33.31, 44.36, ''], ['SA', '沙烏地阿拉伯', 'Saudi Arabia', 24.71, 46.68, '沙特;沙特阿拉伯'],
  ['AE', '阿聯', 'United Arab Emirates', 24.45, 54.38, 'uae;阿拉伯聯合大公國;阿联酋'], ['QA', '卡達', 'Qatar', 25.29, 51.53, '卡塔爾'],
  ['KW', '科威特', 'Kuwait', 29.37, 47.98, ''], ['OM', '阿曼', 'Oman', 23.59, 58.41, ''],
  ['JO', '約旦', 'Jordan', 31.95, 35.93, ''], ['IL', '以色列', 'Israel', 31.77, 35.21, ''],
  ['LB', '黎巴嫩', 'Lebanon', 33.89, 35.5, ''], ['SY', '敘利亞', 'Syria', 33.51, 36.29, ''],
  ['TR', '土耳其', 'Türkiye', 39.93, 32.86, 'turkey;turkiye'], ['YE', '葉門', 'Yemen', 15.37, 44.19, '也門'],
  // Europe
  ['GB', '英國', 'United Kingdom', 51.51, -0.13, 'uk;england;britain;great britain;scotland;wales'], ['FR', '法國', 'France', 48.86, 2.35, ''],
  ['DE', '德國', 'Germany', 52.52, 13.4, 'deutschland'], ['IT', '義大利', 'Italy', 41.9, 12.5, '意大利;italia'],
  ['ES', '西班牙', 'Spain', 40.42, -3.7, 'españa'], ['PT', '葡萄牙', 'Portugal', 38.72, -9.14, ''],
  ['NL', '荷蘭', 'Netherlands', 52.37, 4.9, 'holland'], ['BE', '比利時', 'Belgium', 50.85, 4.35, ''],
  ['CH', '瑞士', 'Switzerland', 46.95, 7.45, ''], ['AT', '奧地利', 'Austria', 48.21, 16.37, ''],
  ['SE', '瑞典', 'Sweden', 59.33, 18.07, ''], ['NO', '挪威', 'Norway', 59.91, 10.75, ''],
  ['DK', '丹麥', 'Denmark', 55.68, 12.57, ''], ['FI', '芬蘭', 'Finland', 60.17, 24.94, ''],
  ['IE', '愛爾蘭', 'Ireland', 53.35, -6.26, ''], ['PL', '波蘭', 'Poland', 52.23, 21.01, ''],
  ['CZ', '捷克', 'Czechia', 50.08, 14.44, 'czech republic'], ['SK', '斯洛伐克', 'Slovakia', 48.15, 17.11, ''],
  ['HU', '匈牙利', 'Hungary', 47.5, 19.04, ''], ['RO', '羅馬尼亞', 'Romania', 44.43, 26.1, ''],
  ['BG', '保加利亞', 'Bulgaria', 42.7, 23.32, ''], ['GR', '希臘', 'Greece', 37.98, 23.73, ''],
  ['HR', '克羅埃西亞', 'Croatia', 45.81, 15.98, '克羅地亞'], ['RS', '塞爾維亞', 'Serbia', 44.79, 20.45, ''],
  ['UA', '烏克蘭', 'Ukraine', 50.45, 30.52, ''], ['RU', '俄羅斯', 'Russia', 55.76, 37.62, ''],
  ['LT', '立陶宛', 'Lithuania', 54.69, 25.28, ''], ['LV', '拉脫維亞', 'Latvia', 56.95, 24.11, ''],
  ['EE', '愛沙尼亞', 'Estonia', 59.44, 24.75, ''], ['SI', '斯洛維尼亞', 'Slovenia', 46.06, 14.51, ''],
  ['IS', '冰島', 'Iceland', 64.15, -21.94, ''], ['BY', '白俄羅斯', 'Belarus', 53.9, 27.57, ''],
  ['GE', '喬治亞', 'Georgia', 41.72, 44.79, '格魯吉亞'], ['AM', '亞美尼亞', 'Armenia', 40.18, 44.51, ''],
  ['AZ', '亞塞拜然', 'Azerbaijan', 40.41, 49.87, '阿塞拜疆'],
  // Americas
  ['US', '美國', 'United States', 38.9, -77.04, 'usa;america;united states of america;us'], ['CA', '加拿大', 'Canada', 45.42, -75.7, ''],
  ['MX', '墨西哥', 'Mexico', 19.43, -99.13, 'méxico'], ['GT', '瓜地馬拉', 'Guatemala', 14.63, -90.51, '危地馬拉'],
  ['BZ', '貝里斯', 'Belize', 17.25, -88.76, '伯利茲'], ['HN', '宏都拉斯', 'Honduras', 14.07, -87.19, '洪都拉斯'],
  ['SV', '薩爾瓦多', 'El Salvador', 13.69, -89.22, ''], ['NI', '尼加拉瓜', 'Nicaragua', 12.11, -86.24, ''],
  ['CR', '哥斯大黎加', 'Costa Rica', 9.93, -84.08, '哥斯達黎加'], ['PA', '巴拿馬', 'Panama', 8.98, -79.52, 'panamá'],
  ['CU', '古巴', 'Cuba', 23.11, -82.37, ''], ['HT', '海地', 'Haiti', 18.54, -72.34, ''],
  ['DO', '多明尼加', 'Dominican Republic', 18.49, -69.93, ''], ['JM', '牙買加', 'Jamaica', 18.0, -76.79, ''],
  ['PY', '巴拉圭', 'Paraguay', -25.26, -57.58, ''], ['CO', '哥倫比亞', 'Colombia', 4.71, -74.07, ''],
  ['VE', '委內瑞拉', 'Venezuela', 10.48, -66.9, ''], ['EC', '厄瓜多', 'Ecuador', -0.18, -78.47, '厄瓜多爾'],
  ['PE', '秘魯', 'Peru', -12.05, -77.04, 'perú'], ['BO', '玻利維亞', 'Bolivia', -16.5, -68.15, ''],
  ['CL', '智利', 'Chile', -33.45, -70.67, ''], ['AR', '阿根廷', 'Argentina', -34.6, -58.38, ''],
  ['UY', '烏拉圭', 'Uruguay', -34.9, -56.16, ''], ['BR', '巴西', 'Brazil', -15.79, -47.88, 'brasil'],
  ['KN', '聖克里斯多福及尼維斯', 'Saint Kitts and Nevis', 17.3, -62.72, 'st kitts'], ['LC', '聖露西亞', 'Saint Lucia', 14.01, -60.99, 'st lucia'],
  ['VC', '聖文森', 'Saint Vincent and the Grenadines', 13.16, -61.22, 'st vincent'],
  // Africa
  ['SZ', '史瓦帝尼', 'Eswatini', -26.32, 31.13, 'swaziland;史瓦濟蘭;斯威士蘭'], ['ZA', '南非', 'South Africa', -25.75, 28.19, ''],
  ['NG', '奈及利亞', 'Nigeria', 9.08, 7.4, '尼日利亞'], ['KE', '肯亞', 'Kenya', -1.29, 36.82, '肯尼亞'],
  ['ET', '衣索比亞', 'Ethiopia', 9.03, 38.74, '埃塞俄比亞'], ['EG', '埃及', 'Egypt', 30.04, 31.24, ''],
  ['MA', '摩洛哥', 'Morocco', 34.02, -6.83, ''], ['GH', '迦納', 'Ghana', 5.6, -0.19, '加納'],
  ['TZ', '坦尚尼亞', 'Tanzania', -6.79, 39.21, '坦桑尼亞'], ['UG', '烏干達', 'Uganda', 0.35, 32.58, ''],
  ['RW', '盧安達', 'Rwanda', -1.95, 30.06, '盧旺達'], ['SN', '塞內加爾', 'Senegal', 14.72, -17.47, ''],
  ['CM', '喀麥隆', 'Cameroon', 3.85, 11.5, ''], ['ZW', '辛巴威', 'Zimbabwe', -17.83, 31.05, '津巴布韋'],
  ['ZM', '尚比亞', 'Zambia', -15.39, 28.32, '贊比亞'], ['MW', '馬拉威', 'Malawi', -13.96, 33.79, ''],
  ['MZ', '莫三比克', 'Mozambique', -25.97, 32.57, '莫桑比克'], ['MG', '馬達加斯加', 'Madagascar', -18.88, 47.51, ''],
  ['BW', '波札那', 'Botswana', -24.65, 25.91, '博茨瓦納'], ['NA', '納米比亞', 'Namibia', -22.56, 17.08, ''],
  ['LS', '賴索托', 'Lesotho', -29.31, 27.48, ''], ['SO', '索馬利亞', 'Somalia', 2.05, 45.32, ''],
  ['SD', '蘇丹', 'Sudan', 15.5, 32.56, ''], ['TN', '突尼西亞', 'Tunisia', 36.81, 10.18, ''],
  ['DZ', '阿爾及利亞', 'Algeria', 36.75, 3.06, ''], ['LY', '利比亞', 'Libya', 32.89, 13.19, ''],
  ['CI', '象牙海岸', "Côte d'Ivoire", 5.36, -4.01, 'ivory coast;cote divoire'], ['CD', '剛果民主共和國', 'DR Congo', -4.44, 15.27, 'democratic republic of the congo'],
  ['CG', '剛果', 'Congo', -4.26, 15.24, ''], ['AO', '安哥拉', 'Angola', -8.84, 13.23, ''],
  ['BF', '布吉納法索', 'Burkina Faso', 12.37, -1.52, ''], ['ML', '馬利', 'Mali', 12.64, -8.0, ''],
  ['NE', '尼日', 'Niger', 13.51, 2.11, ''], ['TD', '查德', 'Chad', 12.13, 15.06, ''],
  ['GM', '甘比亞', 'Gambia', 13.45, -16.58, ''], ['LR', '賴比瑞亞', 'Liberia', 6.3, -10.8, ''],
  ['SL', '獅子山', 'Sierra Leone', 8.48, -13.23, ''], ['MU', '模里西斯', 'Mauritius', -20.16, 57.5, '毛里求斯'],
  ['ER', '厄利垂亞', 'Eritrea', 15.32, 38.93, ''],
  // Oceania
  ['AU', '澳洲', 'Australia', -35.28, 149.13, '澳大利亞'], ['NZ', '紐西蘭', 'New Zealand', -41.29, 174.78, '新西蘭;aotearoa'],
  ['FJ', '斐濟', 'Fiji', -18.14, 178.44, ''], ['PG', '巴布亞紐幾內亞', 'Papua New Guinea', -9.44, 147.18, 'png'],
  ['SB', '索羅門群島', 'Solomon Islands', -9.43, 159.95, ''], ['MH', '馬紹爾群島', 'Marshall Islands', 7.09, 171.38, ''],
  ['PW', '帛琉', 'Palau', 7.5, 134.62, '帕勞'], ['TV', '吐瓦魯', 'Tuvalu', -8.52, 179.2, '圖瓦盧'],
  ['WS', '薩摩亞', 'Samoa', -13.83, -171.76, ''], ['TO', '東加', 'Tonga', -21.14, -175.2, '湯加'],
  ['VU', '萬那杜', 'Vanuatu', -17.73, 168.32, ''], ['KI', '吉里巴斯', 'Kiribati', 1.45, 173.0, ''], ['NR', '諾魯', 'Nauru', -0.55, 166.92, ''],
];

const CITIES = [
  ['VN', '河內', 'Hanoi', 21.03, 105.85, 'ha noi;hà nội'], ['VN', '胡志明市', 'Ho Chi Minh City', 10.82, 106.63, 'saigon;西貢;hcmc;ho chi minh;hồ chí minh'],
  ['VN', '峴港', 'Da Nang', 16.05, 108.2, 'đà nẵng'], ['ID', '雅加達', 'Jakarta', -6.2, 106.85, ''], ['ID', '泗水', 'Surabaya', -7.25, 112.75, ''],
  ['ID', '萬隆', 'Bandung', -6.91, 107.61, ''], ['ID', '峇里島', 'Bali', -8.65, 115.22, '巴厘島'], ['ID', '棉蘭', 'Medan', 3.59, 98.67, ''],
  ['PH', '馬尼拉', 'Manila', 14.6, 120.98, ''], ['PH', '宿霧', 'Cebu', 10.32, 123.89, ''], ['TH', '曼谷', 'Bangkok', 13.75, 100.5, ''],
  ['TH', '清邁', 'Chiang Mai', 18.79, 98.98, ''], ['MY', '吉隆坡', 'Kuala Lumpur', 3.14, 101.69, 'kl'], ['MY', '檳城', 'Penang', 5.41, 100.33, ''],
  ['MY', '新山', 'Johor Bahru', 1.49, 103.74, ''], ['MY', '古晉', 'Kuching', 1.55, 110.36, ''], ['MY', '亞庇', 'Kota Kinabalu', 5.98, 116.07, ''],
  ['MM', '仰光', 'Yangon', 16.84, 96.17, 'rangoon'], ['KH', '金邊', 'Phnom Penh', 11.56, 104.92, ''], ['IN', '新德里', 'New Delhi', 28.61, 77.21, 'delhi'],
  ['IN', '孟買', 'Mumbai', 19.08, 72.88, 'bombay'], ['IN', '班加羅爾', 'Bengaluru', 12.97, 77.59, 'bangalore'], ['IN', '清奈', 'Chennai', 13.08, 80.27, ''],
  ['NP', '加德滿都', 'Kathmandu', 27.7, 85.3, ''], ['BD', '達卡', 'Dhaka', 23.81, 90.41, ''], ['MN', '烏蘭巴托', 'Ulaanbaatar', 47.92, 106.92, ''],
  ['JP', '東京', 'Tokyo', 35.68, 139.69, ''], ['JP', '大阪', 'Osaka', 34.69, 135.5, ''], ['KR', '首爾', 'Seoul', 37.57, 126.98, ''],
  ['KR', '釜山', 'Busan', 35.18, 129.08, ''], ['CN', '北京', 'Beijing', 39.9, 116.4, ''], ['CN', '上海', 'Shanghai', 31.23, 121.47, ''],
  ['CN', '廣州', 'Guangzhou', 23.13, 113.26, ''], ['US', '洛杉磯', 'Los Angeles', 34.05, -118.24, 'la'], ['US', '紐約', 'New York', 40.71, -74.01, 'nyc'],
  ['US', '舊金山', 'San Francisco', 37.77, -122.42, ''], ['GB', '倫敦', 'London', 51.51, -0.13, ''], ['FR', '巴黎', 'Paris', 48.86, 2.35, ''],
  ['AU', '雪梨', 'Sydney', -33.87, 151.21, '悉尼'], ['AU', '墨爾本', 'Melbourne', -37.81, 144.96, ''], ['CA', '多倫多', 'Toronto', 43.65, -79.38, ''],
  ['CA', '溫哥華', 'Vancouver', 49.28, -123.12, ''], ['SZ', '姆巴巴內', 'Mbabane', -26.32, 31.13, ''],
];

// Simplified characters that differ from the Traditional names above, so 泰国 or 马来西亚 still match.
const S2T = Object.fromEntries('国國 马馬 来來 亚亞 尔爾 兰蘭 达達 罗羅 韩韩 宾賓 缅緬 湾灣 门門 华華 约約 纽紐 伦倫 欧歐 乌烏 兹茲 别別 萨薩 麦麥 爱愛 莱萊 东東 宁寧 岛島 广廣 内內 万萬 槟檳 苏蘇 维維 纳納 鲁魯 卢盧 韦韋 赞贊 刚剛 济濟 劳勞 图圖 汤湯 叙敘 绍紹 宫宮 庙廟 庆慶 联聯 贝貝 里里 黎黎 伊伊 腊臘 邁邁 迈邁 庇庇 晋晉 买買 罗羅 滨濱 尼尼 毛毛 求求 坦坦 鲁魯 拉拉 圭圭 维維'.split(' ').map((p) => [...p]).filter((p) => p[0] !== p[1]));
S2T['韩'] = '韓';
export const normPlace = (s) => [...String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()]
  .map((ch) => S2T[ch] ?? ch).join('').replace(/[\s.,'’·・()（）\-_]/g, '').replace(/^(the)/, '');

const entry = ([code, zh, en, lat, lon, alias], kind) => ({ code, kind, name: { zh, en }, lat, lon, keys: [zh, en, ...alias.split(';').filter(Boolean)].map(normPlace) });
// The quick-pick countries keep their existing start points (e.g. the US flight starts on the west coast).
const quick = Object.fromEntries(COUNTRIES.map((c) => [c.code, c]));
const PLACES = [...C.map((r) => entry(r, 'country')), ...CITIES.map((r) => entry(r, 'city'))]
  .map((p) => (p.kind === 'country' && quick[p.code] ? { ...p, lat: quick[p.code].lat, lon: quick[p.code].lon } : p));

// Best match for what the student typed, or null. Exact names first, then prefixes, then a contained name.
export function findPlace(text) {
  const q = normPlace(text);
  if (!q) return null;
  const latin = /^[a-z0-9]+$/.test(q);
  const tests = [(k) => k === q, (k) => q.length >= (latin ? 3 : 2) && k.startsWith(q), (k) => q.length >= (latin ? 4 : 2) && k.length >= (/^[a-z0-9]+$/.test(k) ? 4 : 2) && q.includes(k)];
  for (const test of tests) {
    const hits = PLACES.filter((p) => p.keys.some(test));
    if (hits.length) return hits.sort((a, b) => (a.kind === 'country' ? 0 : 1) - (b.kind === 'country' ? 0 : 1))[0];
  }
  return null;
}

// Where an unrecognised hometown begins: open water in the western Pacific, marked by a glow.
export const SEA_START = { lat: 13.5, lon: 141 };
