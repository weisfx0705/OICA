# 空中群島｜Islands in the Sky

義守大學國際招生互動體驗。從家鄉飛到台灣、高雄與校園，先想像生活、探索學習島和科系，再用學歷、語言與背景選入學橋，最後選課程定錨。沿路可用愛心記下喜歡的內容，產生個人的雙語旅程小結與可分享路線卡。

- 純靜態網站：HTML + CSS + JavaScript 模組，不需要建置工具。
- 3D：Three.js r160（已放在 `vendor/`，不依賴 CDN）。
- 模型全部用程式產生，沒有外部 3D 檔，照片與旁白按需載入。
- 音樂與音效用 Web Audio 即時合成（`js/audio.js`）；另有 Gemini 生成的 82 段中英文 AI 旁白（統一 Charon 男聲），依場景載入本機 MP3。左上角是精簡的圓形播放鍵（金色進度環），語言、從頭播放、自動播放開關與逐字稿收在「⋯」選單；旁白播放時音樂降低。
- 角色為原創雲朵旅伴 Cloudlet（`js/world/traveler.js`），可選雲朵與領巾顏色，具有背包、畢業帽袍與職涯配件。定錨動畫落在所選科系小屋，包含光環、波紋、粒子與錨點圖示。

## 本機預覽

ES 模組不能直接用 `file://` 開啟，請在這個資料夾啟動任何靜態伺服器：

```bash
python3 -m http.server 8000
```

再打開 http://localhost:8000 。

## GitHub Pages

- 倉庫：<https://github.com/weisfx0705/OICA>
- 遊戲：<https://weisfx0705.github.io/OICA/isu-sky-islands/>
- 專案入口：<https://weisfx0705.github.io/OICA/>

發布副本位於 OICA 倉庫的 `isu-sky-islands/`；GitHub Pages 使用 `main` 分支根目錄，不需要建置步驟。先驗證本機副本，再提交本專案及必要首頁入口變更、推送 `origin/main`，最後確認該提交的 Pages 建置及正式網址。

## 每年要更新的內容

招生數字與名單更新 `js/content.js`；各科系的介紹與探索情境在 `js/program-profiles.js`；序章章節、照片及詳細旁白在 `js/prelude-content.js`，其餘旁白逐字稿在 `js/narration-scripts.js`。詳細來源與年度差異見 [SOURCES.md](SOURCES.md)。

| 內容 | 位置 |
| --- | --- |
| 申請期限、申請網址、獎學金說明 | `BRIDGES` |
| 各島的系所、學雜費、授課語言、可到達的橋 | `ISLANDS[].programs` |
| 宿舍價格 | `DORM` |
| 序章的台灣、高雄、校園資訊與排名 | `TAIWAN`、`KAOHSIUNG_STAGE`、`CAMPUS` |
| INTENSE 適用國家 | `INTENSE_COUNTRIES` |
| 介面文字 | `UI` |

每個文字欄位都是 `{ zh, en }`。要加越南文，在同一層加 `vi: '...'`，介面語言切換再加上 `vi` 即可；缺少的欄位會自動退回英文。

入學管道初篩在 `js/logic.js`。`resolveBridge()` 提供建議，使用者可明確選用符合初篩的其他路徑；`programStatus()` 分別檢查路徑、語言及前置學歷。所有科系在選橋前都可預覽；選定入學橋並初步相符後才能定錨。

## 檔案結構

```
index.html          頁面
css/style.css       介面樣式（品牌色取自 international.isu.edu.tw）
js/main.js          渲染器、鏡頭、輸入、畫質自動調整
js/flow.js          遊戲流程（序章 → 四章）
js/content.js       所有內容與數字
js/logic.js         入學管道判定
js/routecard.js     路線卡圖片（1080×1920）與分享
js/world/           地球、台灣、高雄、校園、群島等 3D 場景
assets/             校徽與官方照片（已壓縮）
vendor/             Three.js、OrbitControls、QR code 產生器
```

## 效能設計

- 每個場景只顯示一個區域，其餘隱藏；每座島的靜態物件合併成一個網格，整體約 90 次繪製、6 萬個三角形。
- 手機自動降低解析度；若連續掉幀會再往下調。右上角「省電模式」會關閉陰影並減少物件。
- 沒有後製特效，陰影只在當前區域計算。

## 資料來源

內容依據 2026–2027 外國學生／國際專修部／INTENSE 英文簡章、116 學年度僑生及港澳生單獨招生簡章、會計處 2026 年度收費表、學務處宿舍收費表與 international.isu.edu.tw。查核紀錄見上一層資料夾的〈義守大學遊戲資料查核報告.md〉。

地圖輪廓來自 Natural Earth（公共領域）。照片與圖像來源見 `PHOTO-CREDITS.md`；校徽為義守大學所有。

## 更新旁白

只在本機生成，不在瀏覽器呼叫 Gemini。安裝 `google-genai` 與 FFmpeg 後，透過專用 Keychain wrapper 執行：

```bash
~/.local/bin/with-gemini-key python3 scripts/generate-narration.py
```

API 憑證不寫入遊戲。生成資料寫入 `assets/narration/manifest.json`；音檔為 `assets/narration/<場景>-zh.mp3` 與 `-en.mp3`。修改逐字稿後重新執行，可更新相應音檔。播放器會在首次使用者操作後啟動；瀏覽器若阻擋播放，可按播放重試。


## 序章照片與交通

- 台灣：民主時間軸、夜市、早餐、鐵道與山海；高雄：紅線、橘線、輕軌、旗津渡輪與 T-Pass；校園：教學區、宿舍、元宇宙中心、購物與飯店生活圈、義聯集團。
- 圖片是實拍照片與官方校園圖，採 WebP、延遲載入，可點開放大。來源在 `PHOTO-CREDITS.md`。原始素材位置與轉檔資料在 `assets/photo-manifest.json`。
- `scripts/prepare-photos.py` 可從本機參考資料夾與官方來源重新轉檔。3D 交通與建築為示意；旅行及找路請使用官方地圖。
- 前言驗證：`python3 tests/prelude_test.py`（需先開啟本機伺服器）。


## 導覽與聲音操作

- 每個地圖場景都有視角列（桌機左側、手機右上）：鳥瞰、斜看、自動旋轉、放大／縮小（手機用雙指）、回到預設視角。可拖曳旋轉、平移及縮放台灣與高雄地圖。
- 所有返回一律是「上一步」，依實際走過的順序退回，不顯示目的地名稱。
- 說明面板頂端有收合鈕（手機也可向下滑）：一鍵收成一條標題列，旁白繼續播放，地圖畫面隨即讓出空間；點標題列或在地圖上點新地點時自動展開。

- 校園介紹後進入生活想像，再到學習島預覽；已移除燈籠及十年後身分的前置選擇。
- 「Other Options」在中英文介面都使用這個標題，區分 IFP、INTENSE 等特殊入學選擇。
- 右上角「回到首頁／Start over」重新載入首頁，清空這趟旅程的答案與旁白播放紀錄，保留語言、音樂等使用偏好。
- 台灣、高雄與義守校園總覽，對每種語言在每趟旅程只自動播放一次；被打斷也算已開始介紹，返回時保持安靜。可隨時手動播放或重播。
- 旁白共用一個播放器。切換、暫停或離開時，先用約 240 毫秒淡出，再啟動下一段；快速連點時只播放最後一次選擇，不交叉混音。優先使用 Web Audio GainNode，無支援時使用播放器音量漸變。
- 角色保留旅人背包、學生小背包、畢業帽袍，以及各島職涯配件的變化。
- 語音行為驗證：`python3 tests/narrator_test.py`。


## 生活、預覽、選橋與愛心小結

1. 選擇想像中的生活，再探索學習島；已移除「十年後成為誰」的前置選擇。
2. 入學橋尚未決定時，可以閱讀所有科系、一天與學習歷程，角色留在出發岸邊，科系保持中性預覽。
3. 依學歷、授課語言、身分與國家找入學橋。系統建議不會直接視為已選定，需明確確認。
4. 選橋後回到原本關注且可銜接的島；若無可銜接課程，改顯示該橋可到達的群島。IFP 先經華語島，INTENSE 先看企業合作說明。
5. 確認課程後定錨。愛心紀錄以短列點整理台灣、高雄、義守各自喜歡的內容，連同島與科系寫入畫面及分享圖；沒有點選的內容不會列入。摘要完全在瀏覽器組合，不使用生成 API，也不傳送收藏資料。

`js/journey-content.js`：入學橋與七島旁白；`js/preferences.js`：愛心標籤與中英文短摘要；`js/world/anchor.js`：定錨特效。

驗證：`node tests/catalog.test.mjs`、`node tests/preferences.test.mjs`、`python3 tests/narrator_test.py`、`python3 tests/catalog_views_test.py`、`python3 tests/journey_test.py`。
發布檢查：`python3 tests/deployment_test.py --game-url https://weisfx0705.github.io/OICA/isu-sky-islands/`。


## 收藏清單與連線預覽

- 台灣、高雄、校園總覽及介紹卡片，使用同一份愛心紀錄。清單右側可直接收藏，卡片內也能收藏／取消；實心愛心與粉色邊框同步顯示。未收藏愛心有輕跳提示，減少動態偏好時停用。
- 生活想像會與收藏短摘要一起出現在定錨頁和分享圖，包含「留台工作」、「回家鄉創業」、「兩地橋梁」等原始選擇。
- 「鳥瞰所有島嶼」切到近乎垂直的地圖視角；可回到原島。中文、英文、IFP 的連線是課程關係預覽，不會改寫玩家的背景答案；IFP 僅連到 13 個核定科系的小屋。
- IFP／INTENSE 介紹頁可直接選擇路徑，會直接勾選起點頁「入學路徑」題的對應答案（不另外顯示金色路徑框）；已有完整且符合的背景時直接套用，仍保留語言、學歷及身分檢核。
- INTENSE 依 2026–2027 簡章共兩個專班：英語授課設備工程、中文授課機械與自動化工程。現行共 38 個科系／學程入口。
- 路線卡與定錨頁會完整呈現走過的路徑：例如選 IFP 再選化學工程，顯示「① 國際專修部 IFP → ② 化學工程學系」，飛行路線也多一站華語島。
- 新檢查：`python3 tests/usability_test.py`。
