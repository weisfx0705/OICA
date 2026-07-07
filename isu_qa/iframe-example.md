# index2.html iframe 嵌入範例

把 `src` 換成 GitHub Pages 上的 `index2.html` 網址即可。

```html
<iframe
  src="https://YOUR_ACCOUNT.github.io/YOUR_REPO/index2.html"
  width="420"
  height="680"
  style="border:0; width:420px; height:680px;"
  title="義守大學 OICA AI Assistant"
></iframe>
```

## 指定初始語言

繁體中文：

```html
<iframe
  src="https://YOUR_ACCOUNT.github.io/YOUR_REPO/index2.html?lang=zh"
  width="420"
  height="680"
  style="border:0; width:420px; height:680px;"
  title="義守大學 OICA AI Assistant"
></iframe>
```

English：

```html
<iframe
  src="https://YOUR_ACCOUNT.github.io/YOUR_REPO/index2.html?lang=en"
  width="420"
  height="680"
  style="border:0; width:420px; height:680px;"
  title="ISU OICA AI Assistant"
></iframe>
```

Tiếng Việt：

```html
<iframe
  src="https://YOUR_ACCOUNT.github.io/YOUR_REPO/index2.html?lang=vi"
  width="420"
  height="680"
  style="border:0; width:420px; height:680px;"
  title="Trợ lý AI ISU OICA"
></iframe>
```

## 響應式寫法

如果學校網頁的彈跳視窗寬度會跟著螢幕調整，可以用這版：

```html
<iframe
  src="https://YOUR_ACCOUNT.github.io/YOUR_REPO/index2.html"
  style="border:0; width:100%; height:680px; max-width:420px;"
  title="義守大學 OICA AI Assistant"
></iframe>
```
