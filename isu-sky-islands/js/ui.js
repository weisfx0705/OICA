import { el, t, I18N } from './util.js';
import { UI } from './content.js';

export const ICONS = {
  cloudlet: '<svg viewBox="0 0 64 54" fill="none"><path d="M14 40C3 39 2 24 12 21C11 10 25 4 32 13C42 3 56 12 53 23C65 26 60 42 49 42H17" fill="#F5FAFF" stroke="#7EA1BD" stroke-width="2"/><circle cx="25" cy="29" r="3" fill="#23215F"/><circle cx="42" cy="29" r="3" fill="#23215F"/><path d="M30 36Q34 40 38 36" stroke="#23215F" stroke-width="2" stroke-linecap="round"/><path d="M20 44H48L44 50H25Z" fill="#E4B34F"/></svg>',
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
  bird: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3 3 7.5 12 12l9-4.5z"/><path d="M3 12l9 4.5 9-4.5M3 16.5 12 21l9-4.5" opacity=".55"/></svg>',
  tilt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 16 10 7h10l-6 9z"/><path d="M12 11.5v-6M10 7.5l2-2 2 2" stroke-linecap="round"/></svg>',
  orbit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><ellipse cx="12" cy="12" rx="9" ry="4.5"/><path d="M18.5 8.2 21 7.5l-.6 2.6"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"><path d="M4 11 12 4l8 7"/><path d="M6 10v9h12v-9"/></svg>',
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

  panel({ eyebrow, title, body = [], foot = [], compact = false, tall = false, expand = false, onMount, key } = {}) {
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
      // new content (e.g. a tapped hotspot) always unfolds the panel so the answer is seen
      this.setCollapsed(false);
      old.className = cls;
      old.classList.toggle('expanded', this.expanded);
      old.querySelector('.ph-title').textContent = [eyebrow, title].filter(Boolean).join(' · ');
      scroll.scrollTop = top;
      onMount?.(old);
      return old;
    }
    this.collapsed = false;
    // phones: a lower-third sheet that can grow to full height; forms (expand) open grown
    this.expanded = !!expand;
    if (old) { old.classList.remove('in'); old.inert=true; old.setAttribute('aria-hidden','true'); setTimeout(() => old.remove(), 450); }
    const scroll = el('div', { class: 'panel-scroll' }, eyebrow ? el('p', { class: 'eyebrow' }, eyebrow) : null, title ? el('h2', {}, title) : null, ...body);
    const handle = this.panelHandle([eyebrow, title].filter(Boolean).join(' · '));
    const p = el('section', { class: 'panel' + (compact ? ' compact' : '') + (tall ? ' tall' : '') + (this.expanded ? ' expanded' : ''), role: 'dialog', 'aria-label': title || eyebrow || '' }, handle, scroll, foot.length ? el('div', { class: 'panel-foot' }, ...foot) : null);
    p.dataset.key = k;
    this.root.append(p);
    requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add('in')));
    this.panelEl = p;
    onMount?.(p);
    return p;
  }

  // Header bar that folds the panel away so the map can be explored (narration keeps playing).
  panelHandle(text) {
    const zh = I18N.lang === 'zh';
    const toggle = el('button', { class: 'ph-toggle', type: 'button', 'aria-expanded': 'true', onclick: (e) => { e.stopPropagation(); this.setCollapsed(!this.collapsed); } },
      el('span', { class: 'ph-label-hide' }, zh ? '收合，看地圖' : 'Hide · see map'), el('span', { class: 'ph-label-show' }, zh ? '展開說明' : 'Show details'), el('span', { class: 'ph-chev', 'aria-hidden': 'true' }));
    // one tap: fold the panel and fly out to the whole archipelago (the panel often covers the map on phones)
    const bird = el('button', { class: 'ph-bird', type: 'button', onclick: (e) => { e.stopPropagation(); this.setCollapsed(true); this.birdAction?.(); } }, icon('bird'), el('span', {}, zh ? '鳥瞰地圖' : 'Bird’s-eye map'));
    // phones only: grow the sheet to read more, shrink it back to see the map
    const grow = el('button', { class: 'ph-expand', type: 'button', 'aria-expanded': String(!!this.expanded), onclick: (e) => { e.stopPropagation(); this.setExpanded(!this.expanded); } },
      el('span', { class: 'ph-label-grow' }, zh ? '展開' : 'More'), el('span', { class: 'ph-label-shrink' }, zh ? '縮小' : 'Less'), el('span', { class: 'ph-up', 'aria-hidden': 'true' }));
    const bar = el('div', { class: 'panel-handle' }, el('span', { class: 'ph-grip', 'aria-hidden': 'true' }), el('span', { class: 'ph-title' }, text), bird, grow, toggle);
    bar.addEventListener('click', () => { if (this.collapsed) this.setCollapsed(false); });
    // swipe: down shrinks a grown sheet, then folds it; up unfolds, then grows (touch screens)
    let y0 = null;
    bar.addEventListener('pointerdown', (e) => { y0 = e.clientY; });
    bar.addEventListener('pointerup', (e) => {
      if (y0 == null) return;
      const dy = e.clientY - y0; y0 = null;
      if (dy > 36) { if (this.expanded) this.setExpanded(false); else if (!this.collapsed) this.setCollapsed(true); }
      else if (dy < -36) { if (this.collapsed) this.setCollapsed(false); else if (!this.expanded) this.setExpanded(true); }
    });
    return bar;
  }

  setCollapsed(on) {
    this.collapsed = on;
    if (on) this.setExpanded(false);
    const p = this.panelEl;
    if (!p) return;
    p.classList.toggle('collapsed', on);
    p.querySelector('.ph-toggle')?.setAttribute('aria-expanded', String(!on));
  }

  setExpanded(on) {
    this.expanded = on;
    const p = this.panelEl;
    if (!p) return;
    p.classList.toggle('expanded', on);
    p.querySelector('.ph-expand')?.setAttribute('aria-expanded', String(on));
  }

  closePanel() {
    const old = this.panelEl;
    if (!old) return;
    old.classList.remove('in');
    old.inert=true; old.setAttribute('aria-hidden','true');
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

  // map-style camera controls, always in the same place on every 3D view
  viewDock(items) {
    this.viewDockEl?.remove();
    this.viewDockEl = null;
    // the panel header's "Bird's-eye map" button reuses this dock's bird's-eye action, and shows only when there is one
    this.birdAction = items?.find((it) => it.icon === 'bird')?.onClick || null;
    this.root.classList.toggle('can-bird', !!this.birdAction);
    if (!items) return;
    this.viewDockEl = el('nav', { class: 'view-dock', 'aria-label': I18N.lang === 'zh' ? '視角控制' : 'View controls' },
      ...items.map((it) => it === '|' ? el('span', { class: 'sep', 'aria-hidden': 'true' }) : el('button', { type: 'button', class: 'view-btn' + (it.on ? ' on' : ''), 'data-icon': it.icon, title: it.label, 'aria-label': it.label, 'aria-pressed': it.toggle ? String(!!it.on) : null, onclick: () => it.onClick() }, icon(it.icon), el('span', { class: 'view-label' }, it.label))));
    this.root.append(this.viewDockEl);
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

// Full-size image in a modal; click outside or × to close. A data: URL (the route card) can't open in a new tab.
export function openImage(src, caption, { credit, className = '', zoomable = false } = {}) {
  const dialog = el('dialog', { class: 'photo-viewer' + (className ? ' ' + className : ''), 'aria-label': caption },
    el('button', { class: 'viewer-close', type: 'button', 'aria-label': I18N.lang === 'zh' ? '關閉' : 'Close', onclick: () => dialog.close() }, '×'),
    el('img', { src, alt: caption }),
    el('p', {}, caption, credit ? el('small', {}, credit) : null),
    src.startsWith('data:') ? null : el('a', { href: src, target: '_blank', rel: 'noopener' }, I18N.lang === 'zh' ? '新分頁開啟圖片' : 'Open image in a new tab'));
  // zoomable: a second tap shows the image at full width (tall cards), a third goes back
  if (zoomable) { const img = dialog.querySelector('img'); img.title = I18N.lang === 'zh' ? '再點一下看原尺寸' : 'Tap again for full size'; img.addEventListener('click', () => { dialog.classList.toggle('zoomed'); img.title = dialog.classList.contains('zoomed') ? (I18N.lang === 'zh' ? '點一下縮回' : 'Tap to fit') : (I18N.lang === 'zh' ? '再點一下看原尺寸' : 'Tap again for full size'); }); }
  dialog.addEventListener('close', () => dialog.remove());
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
  document.body.append(dialog); dialog.showModal();
  return dialog;
}

export function gallery(images = []) {
  if (!images.length) return null;
  return el('div', { class: 'chapter-gallery' + (images.length === 2 ? ' gallery-pair' : '') }, images.map((item, index) => {
    const caption = t(item.caption);
    const open = () => openImage(item.src, caption, { credit: item.credit });
    return el('figure', { class: 'chapter-photo' + (index === 0 ? ' hero' : '') },
      el('button', { type: 'button', onclick: open, 'aria-label': (I18N.lang === 'zh' ? '放大照片：' : 'Enlarge photo: ') + caption }, el('img', { src: item.src, alt: caption, loading: 'lazy', decoding: 'async', width: 640, height: 400 }), el('span', { class: 'photo-expand', 'aria-hidden': 'true' }, '↗')),
      el('figcaption', {}, caption));
  }));
}
