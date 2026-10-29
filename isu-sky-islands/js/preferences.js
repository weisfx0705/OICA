const b=(zh,en)=>({zh,en});
export const LIKE_TOPICS={
 taiwan:{overview:b('自由與山海生活','Freedom, mountains and sea'),free:b('民主與多元','Democracy and diversity'),food:b('夜市與多國飲食','Night markets and cuisines'),breakfast:b('台式早餐日常','Taiwanese breakfast'),travel:b('山海與鐵道旅行','Mountains and rail travel'),tech:b('科技與產業','Technology and industry'),safe:b('生活支持與安心','Everyday support')},
 kaohsiung:{overview:b('港灣城市生活','Harbour-city life'),port:b('港灣與駁二','The harbour and Pier-2'),concert:b('音樂與表演','Music and performance'),chip:b('科技產業','Technology industries'),transit:b('捷運與 T-Pass','Metro and T-Pass'),cijin:b('旗津與渡輪','Cijin and ferries'),mountains:b('柴山與西子灣','Chaishan and Sizihwan')},
 campus:{overview:b('校園與學習生活','Campus and learning'),main:b('紅磚校園與庭園','Brick buildings and courtyards'),medical:b('醫學院區與醫療體系','Medical campus and healthcare'),labs:b('動手實作場域','Hands-on learning'),metaverse:b('元宇宙與影像創作','Metaverse and screen creation'),living:b('購物與飯店生活圈','Shopping and hotel neighbourhood'),group:b('跨產業集團資源','A cross-industry network'),rank:b('國際同學與合作','International classmates')},
};
export const SUMMARY_GROUPS={taiwan:b('台灣','Taiwan'),kaohsiung:b('高雄','Kaohsiung'),campus:b('義守','I-Shou')};
export function likedSummary(likes,lang='zh'){
 const saved=likes instanceof Set?[...likes]:Array.isArray(likes)?likes:[];
 return Object.entries(LIKE_TOPICS).flatMap(([group,topics])=>{
  let ids=saved.filter(key=>key.startsWith(group+':')).map(key=>key.split(':')[1]).filter(id=>topics[id]);
  if(ids.length>1)ids=ids.filter(id=>id!=='overview');
  if(!ids.length)return [];
  const names=[...new Set(ids.map(id=>topics[id][lang]||topics[id].en))];
  return [{group,label:SUMMARY_GROUPS[group][lang],text:names.slice(0,3).join(lang==='zh'?'、':', ')+(names.length>3?(lang==='zh'?'等':' and more'):'')}];
 });
}
export const JOURNEY_ENCOURAGEMENT=b('這些喜歡，是走向新生活的小小線索。帶著好奇和勇氣，向新的國家、生活與學習出發。','These little things you love can guide a new chapter. Bring your curiosity and courage to a new country, a new life and a new way of learning.');
