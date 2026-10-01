
/* Single-file deck. Images and QR codes are embedded; no network is needed to present. */
const speakerNotes = [
 '大家早安，我是國際專修部主任陳嘉偉。歡迎大家來到義守大學！今天是你們在這裡展開新生活的重要起點。',
 '今天最想請大家記得的，就是「1＋4」。第一年專心學習華語，並通過華語測驗。第二年開始，你們將進入自己選擇的科系，展開四年的大學學習。',
 '也請大家一起謝謝今天在場的華語老師。除了老師，國際事務處的 Mia、Celia、Jolin、Megan 都是你們生活裡的重要夥伴。有疑問或需要幫忙，請讓我們知道。',
 '大家現在看到我使用的是即時翻譯系統。我們正在進入一個很不同的時代，科技讓不同語言的人更容易聽懂彼此。希望你們善用科技，勇敢認識不同文化的朋友。',
 '請大家拿出手機，掃描這個樹洞 QR Code。你可以用熟悉的語言寫下心事，也可以錄音說給我聽。這是一個我用 AI 建立的樹洞實驗。我會閱讀、整理你們的分享，這個週末透過 Email 把回覆送給大家。',
 '也請大家掃描 QR Code，加入我們的 LINE 社群，讓我們保持聯繫。',
 '謝謝你們有勇氣來到臺灣，跨出人生重要的一步。你們也讓義守校園變得更加美麗、多采多姿。祝福大家在這裡學有所成，走向美好的未來。接下來交給同仁繼續說明。'
];
const sourceNotes = [
 '活動時間與開場內容依陳嘉偉主任提供的資料整理。',
 '依主任提供的 1＋4 課程安排整理，未另訂測驗級別或門檻。',
 '姓名由主任確認：Mia、Celia、Jolin、Megan。',
 '交流插圖以內建 imagegen 製作。完整生成描述隨附於 assets/cross-cultural-conversation-prompt.txt。圖中人物為插圖角色。',
 '樹洞網站：https://weisfx0705.github.io/OICA/isu-tree-hollow/ 。文字、錄音與週末 Email 回覆方式已核對公開網頁。',
 'LINE 社群邀請網址由主任提供，QR Code 編碼包含原邀請參數。',
 '依主任提供的感謝與祝福內容整理。'
];
const slides = [...document.querySelectorAll('.slide')];
const counter = document.getElementById('counter');
const previous = document.getElementById('previous');
const next = document.getElementById('next');
const notes = document.getElementById('notes');
let index = 0, lastFocus = null;
function readHash(){const n=Number(location.hash.slice(1));return Number.isInteger(n)&&n>=1&&n<=slides.length?n-1:0}
function renderNotes(){document.getElementById('notes-text').textContent=speakerNotes[index];document.getElementById('notes-source').textContent=sourceNotes[index]}
function showSlide(n,updateHash=true){index=Math.max(0,Math.min(slides.length-1,n));slides.forEach((slide,i)=>{slide.classList.toggle('active',i===index);slide.hidden=i!==index;slide.setAttribute('aria-hidden',String(i!==index))});counter.textContent=String(index+1).padStart(2,'0')+' / '+String(slides.length).padStart(2,'0');previous.disabled=index===0;next.disabled=index===slides.length-1;document.getElementById('progress').style.width=((index+1)/slides.length*100)+'%';document.title=(index+1)+' / '+slides.length+'　'+slides[index].dataset.title+'｜義守新生說明會';if(updateHash)history.replaceState(null,'','#'+(index+1));renderNotes()}
function resizeDeck(){const viewport=document.querySelector('.viewport');const padding=window.innerWidth<650?8:24;const scale=Math.min((viewport.clientWidth-padding*2)/1600,(viewport.clientHeight-padding*2)/900);document.documentElement.style.setProperty('--scale',Math.max(.05,scale))}
function toggleNotes(force){const opening=typeof force==='boolean'?force:notes.hidden;if(opening){lastFocus=document.activeElement;notes.hidden=false;renderNotes();document.getElementById('close-notes').focus()}else{notes.hidden=true;if(lastFocus&&lastFocus.focus)lastFocus.focus()}}
async function toggleFullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{const toast=document.getElementById('toast');toast.textContent='請使用瀏覽器全螢幕 / Use browser full screen / Dùng chế độ toàn màn hình của trình duyệt';toast.hidden=false;setTimeout(()=>toast.hidden=true,5000)}}
previous.addEventListener('click',()=>showSlide(index-1));next.addEventListener('click',()=>showSlide(index+1));document.getElementById('fullscreen').addEventListener('click',toggleFullscreen);document.getElementById('notes-button').addEventListener('click',()=>toggleNotes());document.getElementById('close-notes').addEventListener('click',()=>toggleNotes(false));notes.addEventListener('click',event=>{if(event.target===notes)toggleNotes(false)});
document.addEventListener('keydown',event=>{if(event.ctrlKey||event.metaKey||event.altKey)return;if(!notes.hidden){if(event.key==='Escape'||event.key.toLowerCase()==='n'){event.preventDefault();toggleNotes(false)}else if(event.key==='Tab'){event.preventDefault();document.getElementById('close-notes').focus()}return}if(event.target.closest('button,a')&&(event.key===' '||event.key==='Enter'))return;switch(event.key){case 'ArrowRight':case 'ArrowDown':case 'PageDown':case ' ':event.preventDefault();showSlide(index+1);break;case 'ArrowLeft':case 'ArrowUp':case 'PageUp':event.preventDefault();showSlide(index-1);break;case 'Home':event.preventDefault();showSlide(0);break;case 'End':event.preventDefault();showSlide(slides.length-1);break;case 'f':case 'F':event.preventDefault();toggleFullscreen();break;case 'n':case 'N':event.preventDefault();toggleNotes();break}});
let touchStart=null;document.getElementById('stage').addEventListener('touchstart',event=>{if(event.touches.length===1&&!event.target.closest('a,button'))touchStart={x:event.touches[0].clientX,y:event.touches[0].clientY};else touchStart=null},{passive:true});document.getElementById('stage').addEventListener('touchend',event=>{if(!touchStart)return;const dx=event.changedTouches[0].clientX-touchStart.x,dy=event.changedTouches[0].clientY-touchStart.y;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy))showSlide(index+(dx<0?1:-1));touchStart=null},{passive:true});
window.addEventListener('resize',resizeDeck);document.addEventListener('fullscreenchange',resizeDeck);window.addEventListener('hashchange',()=>showSlide(readHash(),false));showSlide(readHash(),false);resizeDeck();
