# 空中群島｜Islands in the Sky

義守大學國際招生互動體驗。玩家從自己的國家飛到台灣、高雄與觀音山，選擇十年後的自己、找到自己的入學管道（橋），先到七座未來之島選科系，再看所選科系的一天、學習歷程與未來，最後插旗並得到可分享的路線卡。國際專修部另有華語先修中途島。

- 純靜態網站：HTML + CSS + JavaScript 模組，不需要建置工具。
- 3D：Three.js r160（已放在 `vendor/`，不依賴 CDN）。
- 模型全部用程式產生，沒有外部 3D 檔，首次載入約 1.6 MB（照片只在打開面板時才載入）。
- 音樂與音效用 Web Audio 即時合成（`js/audio.js`）；另有 Gemini 生成的 66 段中英文 AI 旁白（統一 Charon 男聲），依場景載入本機 MP3。可選語言、播放、暫停、重播和閱讀逐字稿；旁白播放時音樂降低。
- 玩家角色是一位背著行囊的旅人（`js/world/traveler.js`）：可選膚色與衣服顏色，從家鄉飛到台灣，抵達校園成為學生，「四年」畢業，「十年後」換上各島的職業裝備。

## 本機預覽

ES 模組不能直接用 `file://` 開啟，請在這個資料夾啟動任何靜態伺服器：

```bash
python3 -m http.server 8000
```

再打開 http://localhost:8000 。

## GitHub Pages

- 倉庫：<https://github.com/weisfx0705/OICA>
- 遊戲：<https://weisfx0705.github.io/OICA/isu-sky-islands/>
- OICA 專案入口：<https://weisfx0705.github.io/OICA/>

本專案位於 OICA 倉庫的 `isu-sky-islands/`。GitHub Pages 使用 `main` 分支根目錄，推送後由既有 Pages 流程發布，不需要建置步驟。所有遊戲資源與 ES 模組採相對路徑，支援此子路徑。

修改前請從 `main` 更新；驗證後僅提交本專案與必要的首頁入口變更，再推送 `origin/main`。保留原有其他專案。

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

入學管道初篩在 `js/logic.js`。`resolveBridge()` 提供建議，使用者可明確選用符合初篩的其他路徑；`programStatus()` 分別檢查路徑、語言及前置學歷。所有科系都可閱讀，初步相符才能插旗。

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

地圖輪廓來自 Natural Earth（公共領域）。照片與校徽為義守大學所有。

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

- 校園介紹後直接進入未來選擇；已移除燈籠關卡與對應音檔。
- 「Other Options」在中英文介面都使用這個標題，區分 IFP、INTENSE 等特殊入學選擇。
- 右上角「回到首頁／Start over」重新載入首頁，清空這趟旅程的答案與旁白播放紀錄，保留語言、音樂等使用偏好。
- 台灣、高雄與義守校園總覽，對每種語言在每趟旅程只自動播放一次；被打斷也算已開始介紹，返回時保持安靜。可隨時手動播放或重播。
- 旁白共用一個播放器。切換、暫停或離開時，先用約 240 毫秒淡出，再啟動下一段；快速連點時只播放最後一次選擇，不交叉混音。優先使用 Web Audio GainNode，無支援時使用播放器音量漸變。
- 角色保留旅人背包、學生小背包、畢業帽袍，以及各島職涯配件的變化。
- 語音行為驗證：`python3 tests/narrator_test.py`。
