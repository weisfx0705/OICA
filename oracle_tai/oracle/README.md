<div align="center">
  <h1>靈曦籤苑 &bull; Mystical Oracle of Guanyin</h1>
  <p><strong>融合傳統東方籤詩文化與生成式 AI 的心靈指引平台</strong></p>
</div>

---

## 免安裝使用

這個專案現在的主要交付形式是「靜態單頁版」：

- 直接開啟 `index.html` 即可使用。
- 不需要 `npm install`。
- 不需要 `node_modules`。
- `sound/` 資料夾需要和 `index.html` 放在同一層，音效才會正常載入。

使用方式：

1. 開啟 `index.html`。
2. 點右上角設定按鈕，輸入 Google Gemini API Key。
3. API Key 只會存在瀏覽器的 `localStorage`。

> 注意：目前頁面仍使用 Tailwind CDN 與 Google Fonts，所以第一次載入需要網路；Gemini 解籤、圖片與語音功能也需要網路和有效的 Gemini API Key。

## 功能

- 語音互動問事：使用瀏覽器 Web Speech API。
- AI 智慧解籤：呼叫 Google Gemini API 產生個人化解讀。
- 生成式籤詩圖：依照籤詩內容產生視覺圖像。
- 大師語音開示：將解讀整理成語音播放並可下載。
- 解籤結果存檔：可把籤詩、解讀與圖片打包成 HTML 檔保存。
- 本地 API Key 管理：使用者自行輸入並保存在本機瀏覽器。

## 專案結構

```text
/
├── index.html              # 可直接執行的單檔前端應用
├── sound/                  # 執行時需要的音效檔
├── App.tsx                 # React 原始碼備份
├── components/             # React 元件原始碼
├── services/               # Gemini 與音訊服務原始碼
├── constants.tsx           # 籤詩資料與 SVG 常數
├── types.ts                # TypeScript 型別
├── package.json            # 只在需要重新建置原始碼時使用
└── vite.config.ts          # 只在需要重新建置原始碼時使用
```

## 關於 `node_modules`

`node_modules` 不應該放進版本庫，也不是使用這個專案的必要條件。此版本已把 `node_modules/` 加入 `.gitignore`，並預期從 Git 追蹤中移除。

如果只是要使用或部署目前版本，保留這些檔案即可：

```text
index.html
sound/
```

如果未來要回到 React/TypeScript 原始碼開發，才需要安裝依賴並重新建置：

```bash
npm install
npm run build
```

## 技術說明

目前的 `index.html` 已經把 React、ReactDOM 與 Gemini SDK bundle 進單一 HTML。也就是說，瀏覽器執行時不會去讀取 `node_modules`。

仍需注意兩件事：

- Tailwind CDN 與 Google Fonts 是外部網路資源，不是 `node_modules`。
- 直接在瀏覽器端使用 Gemini API Key 適合個人工具或受信任環境；若要公開給多人使用，建議改成後端代理 API，避免金鑰暴露。

## 開發者

本專案由義守大學大眾傳播學系陳嘉暐老師開發與設計。

> 「一切法從心想生，解籤僅供參考，未來掌握在您手中。」
