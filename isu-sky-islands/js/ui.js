import { el, t, I18N } from './util.js';
import { UI } from './content.js';

export const ICONS = {
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  plane: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M21 15.5v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V8.5l-8 5v2l8-2.5V18l-2 1.5V21l3.5-1 3.5 1v-1.5L13 18v-5z"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.9 7.6-4.4M8.2 13.1l7.6 4.4"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg>',
  flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
  replay: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 12a8 8 0 1 0 3-6.2M4 4v5h5"/></svg>',
  speaker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" stroke-linecap="round"/></svg>',
  ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
};
export const icon = (name) => { const s = el('span', { 'aria-hidden': 'true', style: { display: 'inline-flex' } }); s.innerHTML = ICONS[name]; return s; };

export class UIRoot {
  constructor(root) {
    this.root = root;
    this.panelEl = null;
    this.captionEl = el('div', { class: 'caption', role: 'status', 'aria-live': 'polite' });
    this.toastEl = el('div', { class: 'toast', role: 'status' });
    root.append(this.captionEl, this.toastEl);
  }

  topbar({ onHome, onLang, onLite, lite, onSound, soundOn }) {
    this.top?.remove();
    const progress = el('nav', { class: 'progress', 'aria-label': 'progress', hidden: true });
    const langBtn = el('button', { class: 'pill', type: 'button', onclick: onLang, 'aria-label': 'Language' }, icon('globe'), el('span', { class: 'label' }, I18N.lang === 'zh' ? 'EN' : '中文'));
    const soundBtn = el('button', { class: 'pill' + (soundOn ? ' active' : ''), type: 'button', onclick: onSound, title: t(UI.soundOn), 'aria-pressed': String(!!soundOn) }, icon('speaker'), el('span', { class: 'label' }, t(UI.soundOn)));
    const liteBtn = el('button', { class: 'pill' + (lite ? ' active' : ''), type: 'button', onclick: onLite, title: t(UI.lowPower), 'aria-pressed': String(!!lite) }, icon('bolt'), el('span', { class: 'label' }, t(UI.lowPower)));
    const homeBtn = el('button', { class: 'pill home-button', type:'button', onclick:onHome, 'aria-label':I18N.lang==='zh'?'回到首頁，重新開始':'Return to home and start over', title:I18N.lang==='zh'?'回到首頁，重新開始':'Return to home and start over' },icon('replay'),el('span',{class:'home-long'},I18N.lang==='zh'?'回到首頁':'Start over'),el('span',{class:'home-short'},I18N.lang==='zh'?'首頁':'Home'));
    this.top = el('header', { class: 'topbar' },
      el('a', { class: 'brand', href: 'https://international.isu.edu.tw/', target: '_blank', rel: 'noopener', 'aria-label': 'I-Shou University' }, el('img', { src: 'assets/isu-wordmark.png', alt: '義守大學 I-Shou University', width: 301, height: 83 })),
      progress,
      el('div', { class: 'tools' }, homeBtn, soundBtn, langBtn, liteBtn),
    );
    this.progressEl = progress;
    this.root.prepend(this.top);
  }

  setProgress(index) {
    const p = this.progressEl;
    if (!p) return;
    if (index < 0) { p.hidden = true; return; }
    p.hidden = false;
    p.replaceChildren(...UI.chapters.map((c, i) => el('div', { class: 'step' + (i < index ? ' done' : '') + (i === index ? ' now' : '') }, el('i'), el('span', {}, t(c)))));
  }

  panel({ eyebrow, title, body = [], foot = [], compact = false, tall = false, onMount, key } = {}) {
    const old = this.panelEl;
    const k = key ?? `${eyebrow}|${title}`;
    const cls = 'panel in' + (compact ? ' compact' : '') + (tall ? ' tall' : '');
    // same panel → update in place (no slide, keep scroll position)
    if (old && old.dataset.key === k && old.classList.contains('in')) {
      const scroll = old.querySelector('.panel-scroll');
      const top = scroll.scrollTop;
      scroll.replaceChildren(...[eyebrow ? el('p', { class: 'eyebrow' }, eyebrow) : null, title ? el('h2', {}, title) : null, ...body].filter(Boolean));
      old.setAttribute('aria-label', title || eyebrow || '');
      old.querySelector('.panel-foot')?.remove();
      if (foot.length) old.append(el('div', { class: 'panel-foot' }, ...foot));
      old.className = cls;
      scroll.scrollTop = top;
      onMount?.(old);
      return old;
    }
    if (old) { old.classList.remove('in'); setTimeout(() => old.remove(), 450); }
    const scroll = el('div', { class: 'panel-scroll' }, eyebrow ? el('p', { class: 'eyebrow' }, eyebrow) : null, title ? el('h2', {}, title) : null, ...body);
    const p = el('section', { class: 'panel' + (compact ? ' compact' : '') + (tall ? ' tall' : ''), role: 'dialog', 'aria-label': title || eyebrow || '' }, scroll, foot.length ? el('div', { class: 'panel-foot' }, ...foot) : null);
    p.dataset.key = k;
    this.root.append(p);
    requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add('in')));
    this.panelEl = p;
    onMount?.(p);
    return p;
  }

  closePanel() {
    const old = this.panelEl;
    if (!old) return;
    old.classList.remove('in');
    setTimeout(() => old.remove(), 450);
    this.panelEl = null;
    document.body.classList.remove('panel-open');
  }

  caption(text, ms = 3200, { free = false } = {}) {
    const c = this.captionEl;
    c.classList.toggle('free', free);
    c.textContent = text;
    c.classList.add('in');
    clearTimeout(this._capT);
    return new Promise((res) => { this._capT = setTimeout(() => { c.classList.remove('in'); setTimeout(res, 700); }, ms); });
  }

  toast(text, ms = 2600) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('in');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => this.toastEl.classList.remove('in'), ms);
  }

  dock(buttons) {
    this.dockEl?.remove();
    if (!buttons) return;
    this.dockEl = el('div', { class: 'dock' }, ...buttons.map((b) => el('button', { class: 'pill', type: 'button', onclick: b.onClick }, el('span', {}, b.label))));
    this.root.append(this.dockEl);
  }
}

export function photo(src, alt = '') {
  const img = el('img', { alt, loading: 'lazy', decoding: 'async' });
  img.addEventListener('load', () => img.classList.add('ready'));
  img.src = src;
  return el('div', { class: 'photo' }, img);
}

export function button(label, onClick, { kind = '', iconName, disabled } = {}) {
  return el('button', { class: 'btn' + (kind ? ' ' + kind : ''), type: 'button', onclick: onClick, disabled }, label, iconName ? icon(iconName) : null);
}

export function link(label, href, { kind = 'quiet', iconName = 'ext' } = {}) {
  return el('a', { class: 'btn ' + kind, href, target: '_blank', rel: 'noopener', style: { textDecoration: 'none' } }, label, icon(iconName));
}

export function gallery(images = []) {
  if (!images.length) return null;
  return el('div', { class: 'chapter-gallery' + (images.length === 2 ? ' gallery-pair' : '') }, images.map((item, index) => {
    const caption = t(item.caption);
    const open = () => {
      const dialog = el('dialog', { class: 'photo-viewer', 'aria-label': caption },
        el('button', { class: 'viewer-close', type: 'button', 'aria-label': I18N.lang === 'zh' ? '關閉照片' : 'Close photo', onclick: () => dialog.close() }, '×'),
        el('img', { src: item.src, alt: caption }),
        el('p', {}, caption, item.credit ? el('small', {}, item.credit) : null),
        el('a', { href: item.src, target: '_blank', rel: 'noopener' }, I18N.lang === 'zh' ? '新分頁開啟圖片' : 'Open image in a new tab'));
      dialog.addEventListener('close', () => dialog.remove());
      dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
      document.body.append(dialog); dialog.showModal();
    };
    return el('figure', { class: 'chapter-photo' + (index === 0 ? ' hero' : '') },
      el('button', { type: 'button', onclick: open, 'aria-label': (I18N.lang === 'zh' ? '放大照片：' : 'Enlarge photo: ') + caption }, el('img', { src: item.src, alt: caption, loading: 'lazy', decoding: 'async', width: 640, height: 400 }), el('span', { class: 'photo-expand', 'aria-hidden': 'true' }, '↗')),
      el('figcaption', {}, caption));
  }));
}
