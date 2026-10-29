# 內容與查核

更新：2026-10-29。發布目標為 https://weisfx0705.github.io/OICA/isu-sky-islands/ 。

## 系所收錄範圍

遊戲以 **2026–2027 外國學生招生簡章**的系所名單為主要範圍，另收錄 **2027 春季 INTENSE**，本版共 38 個探索入口。不是將學校歷年所有學術單位都當作當期可申請選項。一般系所入口主要呈現學士階段；其他學位是否開放請看簡章。

- [2026–2027 外國學生招生簡章](https://aa.isu.edu.tw/storage/files/kmbFesmsgw7Gf6YbKzqyDfgOMd3dGci7XAir3Un9.pdf)：印刷頁 1–3 名單、學位與修業年限。補入學士後中醫、文創傳播與設計碩士班、管理博士班。
- [全校學術單位](https://www.isu.edu.tw/academics)：核對系所名稱與官方網站。38 個遊戲入口的外連均逐一開啟，HTTP 200；土木網站第一次暫時回傳 502，重試成功。
- [英語學程](https://international.isu.edu.tw/english-taught-programs/)：5 個一般英語學士學程及 IMBA。
- 僑港澳入口與 IFP 可銜接名單保留原資料查核依據；參考上層〈義守大學遊戲資料查核報告.md〉。IFP 為 13 個銜接科系，不能銜接所有科系。

## 國際專修部

- [國際專修部說明](https://international.isu.edu.tw/international-foundation-program/)
- [2026–2027 國際專修部招生簡章](https://aa.isu.edu.tw/storage/files/dpmmFCSx5AxtQddHOtVoSyJzNuuDa17Y6dCkBeOK.pdf)
- 一年華語先修、720 小時、TOCFL 聽讀 A2 後銜接核定學士班；升大二 B1 及轉系限制沿用已查核的簡章與修業辦法。遊戲中的華語先修島是這段歷程的視覺化，不是獨立學位。

## INTENSE 的年度差異

[2027 春季招生簡章](https://aa.isu.edu.tw/storage/files/FbBnQA6DtVcbXP0yHeRn9ESz40VpEeeLeHeuoWb8.pdf) 印刷頁 1 明列：

- 電機工程學系開設：學士後設備工程二年制學士專班，英語授課。
- 機械與自動化工程學系開設：二年制學士專班，中文授課。
- 修業二年，包含一年在校與一年校外企業實習。
- 申請截止日 2026-11-20，2027-02-22 開學。申請表採此簡章的網址。

因此遊戲移除舊版「INTENSE 半導體工程」入口，將中文專班移到製造島。新簡章與[國際招生網 INTENSE 頁](https://international.isu.edu.tw/intense-program/)的概括說明有差異，**2027 春季專班名稱、學制與申請連結以當期簡章為準**。

合作企業名單取自國際招生網：日月光、東陽、星博電子、洪興研磨、世華金屬。這是整體計畫的合作名單，未宣稱個別學生會媒合至其中任一企業。企業分配、受獎、實習與工作義務依當期簡章及契約。

## 科系介紹與探索情境

`js/program-profiles.js` 為每一個入口分別編寫中英文介紹、適合興趣、四項能力、三段一天情境與可能發展。主題依原 `content.js` 的科系特色與官方系所入口整理；時間、年級安排與活動是**探索情境**，不是已核准的課表或就業承諾。每個科系面板都提供官方網站供查詢課程及最新要求。

亮燈只代表目前回答下「路徑、授課語言、學歷」的初步相符，不是正式資格或錄取判定。研究所、學士後、INTENSE 不會套用一般學士四年時間線。

## AI 旁白（本輪更新）

- 82 段本地 MP3，中文 41 段、英文 41 段；同一預設嗓音 **Charon**，低音域、沉穩的男性導覽設定。
- 模型：`gemini-3.1-flash-tts-preview`。不是聲音複製；為 Gemini 生成的 AI 旁白。
- 逐字稿在 `js/narration-scripts.js` 及 `js/prelude-content.js`；完整生成紀錄在 `assets/narration/manifest.json`。
- 中文聲線指示：Read the transcript exactly. Use the same mature male narrator throughout. Low, resonant baritone register; calm, grounded, warm documentary delivery. Consistent timbre and vocal weight across all clips. Natural Taiwan Mandarin and Taiwanese pronunciation. Moderate conversational pace, short sentence pauses. No advertising cadence, theatrical suspense, falsetto or exaggerated rasp. Do not add, translate, or paraphrase words.
- 英文聲線指示：Read the transcript exactly. Use the same mature male narrator throughout. Low, resonant baritone register; calm, grounded, warm documentary delivery. Consistent timbre and vocal weight across all clips, including the Mandarin version. Clear international English, moderate conversational pace and short sentence pauses. No advertising cadence, theatrical suspense, falsetto or exaggerated rasp. Pronounce I-Shou as ee-show. Do not add, translate, or paraphrase words.
- 按場景載入，瀏覽器不呼叫生成 API。語言切換、暫停、重播與逐字稿皆保留。更換聲線使用新的音檔版本參數，避免沿用舊快取。
- 本機生成只透過專用 Keychain wrapper，前端不包含 API 憑證。

## 台灣、高雄與義大生活圈

- 民主歷程：[總統府民主里程碑](https://www.president.gov.tw/qrcode/19c)、[民主改革與政黨輪替](https://www.president.gov.tw/NEWS/11307)。1987 解嚴、1991–1992 改革及國會全面改選、1996 總統直選、2000 和平政黨輪替，採時間軸呈現，不把民主化歸為單一日期。
- 婚姻平權：[內政部 2019-05-24 公告](https://www.moi.gov.tw/News_Photo_Content.aspx?n=5510&s=280824)。
- 對外一律使用 **T-Pass** 月票名稱；高雄市區方案 399 元／30 天。適用票卡、運具與台鐵限制依[一卡通官方說明](https://web.i-pass.com.tw/Page/SouthRegion)，不是全台或所有鐵路通用，高鐵需另購票。
- 高雄軌道路線參考[高捷官方路線圖](https://www.krtc.com.tw/Guide/guide_map?OpBrowser=1)。遊戲的紅線、橘線、輕軌和鼓山—旗津渡輪，以及台灣高鐵與台鐵，皆為交通關係示意；不是導航或完整站位圖。
- 校園建築位置與照片對照[義守官方地理環境與校園圖](https://www.isu.edu.tw/page/GTGCDRbA3x8D)。3D 距離與比例簡化，面板提供可放大的官方平面圖。
- 元宇宙科技藝術設計中心：[官方特色場域](https://www.isu.edu.tw/field)、[影視新科技](https://filmtv.isu.edu.tw/page/%E5%BD%B1%E8%A6%96%E6%96%B0%E7%A7%91%E6%8A%80-ixrKepwV1jxp)。
- 集團名稱為[義聯集團 EUnited Group](https://www.e-united.com.tw/about/index)，官方品牌亦用「義联」字樣。呈現生產、教育、醫療、地產及休閒四個事業體，不承諾個別學生的實習與就業。
- 新增 27 張照片與校園圖，來自使用者提供的兩個資料夾及校方網站。來源檔合計約 118.64 MB，縮圖／WebP 成品約 4.42 MB，縮小約 96%；按需載入，可點開看大圖。來源見 `PHOTO-CREDITS.md` 與 `assets/photo-manifest.json`。

## 驗證

```bash
node tests/catalog.test.mjs
python3 -m http.server 8000 --bind 127.0.0.1
# 另一個終端機
python3 tests/browser_test.py
```

測試涵蓋 38 份科系資料、中英文內容、語言／學歷／路徑、IFP 13 系、INTENSE 2 班、3D 房屋點擊、路線卡、手機版，以及旁白播放、暫停與語言切換。

本次執行結果：資料與入學條件檢查通過；76 個中英文科系檢視通過；3D 房屋點擊、篩選、IFP、INTENSE、路線卡、360／390 px 手機版與旁白操作通過。另以最後版本驗證首次手機導覽播放、鍵盤切換頁籤、隱藏標籤焦點，以及依科系產生路線卡與詢問信內容。


本輪驗證（2026-10-29）：38 個中英文章節檢視、照片對話框、飛機飛行及抵達後角色恢復、台灣雙鐵與高雄四種交通、灰階切換還原、390px 手機版、T-Pass 名稱與旁白逐字稿皆通過。76 段 Charon 音檔全部可解碼，時長約 11.3–43.7 秒。既有科系、IFP、INTENSE、路線卡與音訊控制回歸檢查通過。


## 本輪導覽調整

- 高鐵以南港／台北到左營的完整西部路廊呈現，包含 12 站示意點，曲線依地表重新取樣，避免被地形遮住。參考[台灣高鐵](https://www.thsrc.com.tw/ArticleContent/a3b630bb-1066-4352-a1ef-58c7b4e8ef7c)。
- 地形以中東部山脈、西部較平緩的平原作概念呈現；山脈位置與寬度已調整，仍非高程測量模型。參考[行政院・地文](https://www.ey.gov.tw/state/4447F4A951A1EC45/52515c49-bcc0-45f5-bd5f-78c22c9d3f45)。
- 高雄山海場景改為柴山／壽山與西子灣，並以哈瑪星、鼓山渡輪、旗津的相對關係呈現。照片與介紹依[高雄旅遊網・壽山](https://khh.travel/zh-tw/attractions/detail/102/)及[西子灣觀景台](https://khh.travel/zh-tw/attractions/detail/1214/)。
- 燈籠關卡與其 10 段音檔已移除。前版 66 段旁白，皆維持 Charon 設定。
- 台灣、高雄、校園總覽的自動播放紀錄只保留於本趟旅程的記憶體；完整回首頁重來會重置。卡片介紹與手動重播不受此限制。
- 淡出使用單一音訊元素與 GainNode 排程，完成淡出才換來源；支援不足時以音量漸變退回。依[Web Audio 音量排程](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/linearRampToValueAtTime)實作，避免只依賴手機 HTML 音量控制。


本輪檢查結果：高鐵全線 1,001 個曲線取樣均高於地表，示意站點 12 個；西部平原與中東部山脈高度差確認。柴山、西子灣模型與三張對應照片可見；燈籠關卡已無入口。Other Options、中英文章節、手機首頁按鈕、完整重置與旅人／學生／畢業／職涯外觀均通過。旁白已測試三個總覽不重複自動播放、手動重播、快速切換只播放最後選擇，以及前段停止後才啟動後段。實際音訊測試確認 GainNode 音量在淡出中逐步降低，淡出中保留舊來源，完成後才更換音檔。


## 本輪生活與學習流程

前置流程改為生活想像 → 學習島與科系預覽 → 依出發背景選入學橋 → 課程確認與定錨。七島介紹和入學橋說明均提供中英文 Charon 旁白，總覽及島嶼介紹可手動重播。角色為程式繪製的原創雲朵旅伴，不代表校方官方吉祥物。

愛心標籤由各段內容預先整理，每個地點最多列出三個短標籤，額外選項以「等／and more」表示；收藏總覽與細項時優先顯示細項。只呈現玩家實際點選的內容，不使用 AI 生成偏好或評價；完整重新開始會清除本趟紀錄。定錨頁及 1080×1920 分享圖均呈現短摘要、所選島與科系，搭配固定的中英文鼓勵文字。

驗證涵蓋：心情／生活選擇、選橋前的全部 38 科系雙語預覽、語言及學歷篩選、明確確認橋、IFP／INTENSE 回到原關注科系、愛心保留及取消、無收藏時不捏造摘要、分享圖中的短文字、雲朵角色與科系專屬定錨特效。


本輪測試結果：76 個雙語科系預覽、38 個前導章節、愛心跨頁保留與取消、無收藏不補造內容、畫面及分享圖摘要、中英文切換、完整重置、IFP 與 INTENSE 銜接原科系均通過。發布副本在 `/OICA/isu-sky-islands/` 子路徑驗證旁白、生活選擇、預覽先於選橋、明確確認橋、雲朵角色、科系定錨與手機回首頁，無執行錯誤或失敗資源請求。


## 本次介面與可選路徑更正

INTENSE 依 2026–2027 簡章恢復為**兩個專班**：英語授課的學士後設備工程二年制學士專班（電機系），以及中文授課的機械與自動化工程二年制學士專班（TOCFL A2 以上）。前一版（Codex 修改，提交 f6479a1）曾以「使用者確認」為由移除中文專班；經比對官方簡章，本版重新列入，對應介紹、旁白（重新生成 bridge-intense 中英文兩段，Charon 男聲）與語言檢核已同步。申請資格以當期簡章為準。

課程連線採科系 ID 精確篩選：IFP 13 個、英文授課 7 個（含一般英語學士、IMBA 及 INTENSE 設備工程）、中文授課 31 個（含 INTENSE 機械與自動化工程）。連線只說明課程語言或管道關係，不等於正式申請資格。在 IFP／INTENSE 介紹頁選擇路徑，會直接勾選起點頁「入學路徑」題的對應答案；完成背景條件後才確定入學橋。

旗津維持獨立島體，港灣水面連續跨過原本的草地缺口；渡輪路徑位於海面。愛心按鈕在清單與卡片同步，生活想像另外寫入摘要與分享圖。跳動提示尊重系統減少動態偏好。


本輪驗證通過：三個介紹區的卡片與清單愛心同步、清單收藏標記、渡輪航道三個取樣點為海面、近垂直鳥瞰、中文 30／英文 7／IFP 13 個精確連線、IFP 選定後省略路徑問題、INTENSE 僅英語設備且可直接確認英語、中文背景無法誤確認 INTENSE、生活想像出現在摘要與分享圖。雙語及手機頁面無執行錯誤或失敗資源請求。
