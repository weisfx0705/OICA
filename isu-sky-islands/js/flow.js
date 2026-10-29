import * as THREE from 'three';
import { I18N, t, el, storage, wait, haversineKm } from './util.js';
import { UI, COUNTRIES, TAIWAN, KAOHSIUNG_STAGE, CAMPUS, LIFE_CARDS, QUESTIONS, ISLANDS, BRIDGES, DORM, MANDARIN_TOWER, META } from './content.js';
import { resolveBridge, programReachable, programStatus, routeEligible, programJourney, yearsLabel, levelLabel, matchesConnectionFilter, studyPath } from './logic.js';
import { photo, button, link, icon, gallery } from './ui.js';
import { SKINS, OUTFITS } from './world/traveler.js';
import { drawRouteCard, exportRouteCard } from './routecard.js';
import { WORLD } from './world/layout.js';
import { sound } from './audio.js';
import { ADMISSION_INTRO, ISLAND_INTROS } from './journey-content.js';
import { PROGRAM_PROFILES } from './program-profiles.js';
import { LIKE_TOPICS, likedSummary, JOURNEY_ENCOURAGEMENT } from './preferences.js';
import { Narrator } from './narrator.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export class Flow {
  constructor(app) {
    this.app = app;
    this.ui = app.ui;
    this.narrator = new Narrator(this.ui.root, () => this.toggleLang());
    this.s = { country: null, home: null, homeLabel: '', interest: null, life: null, answers: {}, bridge: null, alts: [], needLanguage: false, visited: new Set(), likes: new Set(), stations: {}, flag: null, name: '', look: { skin: SKINS[1], outfit: OUTFITS[0] } };
    this.render = null;
    this.relabel = null;
    this.progress = -1;
    this.nav = [];
    this.soundPref = storage.get('isu-sound', true);
    this.drawTopbar();
  }

  // ---------- shared helpers ----------
  toggleLang() {
    I18N.lang = I18N.lang === 'zh' ? 'en' : 'zh';
    storage.set('isu-lang', I18N.lang);
    this.narrator.setScene(this.narrator.key);
    document.documentElement.lang = I18N.lang === 'zh' ? 'zh-Hant-TW' : 'en';
    this.drawTopbar();
    this.ui.setProgress(this.progress);
    this.render?.();
    this.relabel?.();
    if (this.dockOn) this.showDock();
    if(this.mapToolsEl)this.showMapTools();
    if(this.viewCfg)this.showViews(this.viewCfg);
  }

  drawTopbar() {
    this.ui.topbar({ onHome: () => this.restart(), onLang: () => this.toggleLang(), onLite: () => this.toggleLite(), lite: this.app.q.lite, onSound: () => this.toggleSound(), soundOn: sound.on });
    this.ui.setProgress(this.progress);
  }

  toggleSound() {
    const on = sound.toggle();
    this.soundPref = on;
    storage.set('isu-sound', on);
    this.drawTopbar();
  }

  toggleLite() {
    storage.set('isu-lite', !this.app.q.lite);
    location.reload();
  }

  setProgress(i) { this.progress = i; this.ui.setProgress(i); }

  // ---------- one history for every "Back" ----------
  enter(key, fn) {
    if (this.navBack) { const top = this.nav[this.nav.length - 1]; if (top) top.fn = fn; return; }
    const i = this.nav.findIndex((n) => n.key === key);
    if (i >= 0) this.nav.length = i;
    this.nav.push({ key, fn });
  }

  async goBack() {
    if (this.busy || this.nav.length < 2) return;
    this.nav.pop();
    const prev = this.nav[this.nav.length - 1];
    this.navBack = true;
    try { await prev.fn(); } finally { this.navBack = false; }
  }

  backButton(fn = null) {
    if (!fn && this.nav.length < 2) return null;
    return el('button', { class: 'btn quiet small back-step', type: 'button', onclick: fn || (() => this.goBack()) }, icon('back'), I18N.lang === 'zh' ? '上一步' : 'Back');
  }

  crumbs(items) {
    return el('nav', { class: 'crumbs', 'aria-label': I18N.lang === 'zh' ? '目前位置' : 'You are here' }, items.flatMap((it, i) => [
      i ? el('span', { class: 'gt', 'aria-hidden': 'true' }, '›') : null,
      it.fn ? el('button', { type: 'button', onclick: it.fn }, it.label) : el('span', { class: 'here' }, it.label),
    ]).filter(Boolean));
  }

  async gotoPrelude(stage) {
    const app = this.app;
    this.ui.closePanel(); app.labels.clear(); this.render = null; this.hideViews();
    const setup = {
      globe: () => { app.setStage('globe'); app.place(V(0, 0, 36), V(0, 0, 0)); app.globe.autoSpin = true; },
      taiwan: () => this.toTaiwan(),
      kaohsiung: () => { app.setStage('kaohsiung'); app.place(app.frameView(WORLD.kaohsiung, 36, V(-0.1, 0.7, 1)), WORLD.kaohsiung.clone().add(V(0, 2, 0))); },
      campus: () => this.toCampus(false),
    }[stage];
    if (app.stageName !== stage) await app.wipe(setup);
    ({ globe: () => this.globeStep(), taiwan: () => this.taiwanStep(), kaohsiung: () => this.kaohsiungStep(), campus: () => this.campusStep() })[stage]();
  }

  // ---------- view dock: bird's-eye · angled · orbit · zoom · home ----------
  showViews(cfg) {
    this.viewCfg = cfg;
    const app = this.app, zh = I18N.lang === 'zh';
    app.exploreCfg = { minPolar: 0.02, maxPolar: 1.38, ...cfg };
    this.ui.viewDock([
      { icon: 'bird', label: zh ? '鳥瞰' : 'Bird’s-eye view', onClick: () => (cfg.onBird ? cfg.onBird() : app.viewBird()) },
      { icon: 'tilt', label: zh ? '斜角視角' : 'Angled view', onClick: () => app.viewTilt() },
      { icon: 'orbit', label: zh ? '自動環繞' : 'Auto-orbit', toggle: true, on: app.spinning, onClick: () => { app.toggleSpin(); this.showViews(this.viewCfg); } },
      '|',
      { icon: 'plus', label: zh ? '放大' : 'Zoom in', onClick: () => app.zoomBy(0.7) },
      { icon: 'minus', label: zh ? '縮小' : 'Zoom out', onClick: () => app.zoomBy(1.4) },
      '|',
      { icon: 'home', label: zh ? '回到預設視角' : 'Reset view', onClick: () => app.viewHome() },
    ]);
  }

  hideViews() { this.viewCfg = null; this.app.exploreCfg = null; this.ui.viewDock(null); }

  islandsView(onBird = () => this.birdsEye()) {
    const look = WORLD.islands.clone().add(V(0, -6, 0));
    const pos = this.app.frameView(look, 63, V(0, 1, 0.12));
    this.showViews({ center: look, radius: 66, home: { pos, look }, onBird });
    return { pos, look };
  }

  view(fn) { this.render = fn; fn(); }

  labels(fn) { this.app.labels.clear(); this.relabel = () => { this.app.labels.clear(); fn(); }; fn(); }

  islandWorld(isl) { return this.app.arch.worldPos(isl); }

  // put the traveler somewhere in the world (parent space), optionally facing a point
  placeTraveler(parent, local, scale = 1, faceWorld = null) {
    const tr = this.app.traveler;
    parent.add(tr.group);
    tr.group.visible = true;
    tr.group.position.copy(local);
    tr.group.quaternion.identity();
    tr.group.scale.setScalar(scale);
    tr.mode = 'idle';
    if (faceWorld) tr.face(faceWorld);
    return tr;
  }

  youLabel(offset = 2.6) {
    const tr = this.app.traveler;
    this.app.labels.hotspot('you', tr.group, t(UI.you), null, { className: 'tag-only you', offsetY: offset * tr.group.scale.x });
  }

  lookPicker() {
    const tr = this.app.traveler;
    const row = (label, list, key) => el('div', { class: 'row' }, el('span', {}, t(label)), list.map((c) => el('button', { class: 'swatch' + (this.s.look[key] === c ? ' on' : ''), type: 'button', style: { background: c }, 'aria-label': c, onclick: () => { this.s.look[key] = c; tr.setLook(this.s.look); tr.wave(); this.render(); } })));
    return el('div', { class: 'look' }, el('p', { class: 'qt', style: { margin: 0, fontWeight: 700, color: '#23215F' } }, t(UI.lookTitle)), row(UI.skin, SKINS, 'skin'), row(UI.outfit, OUTFITS, 'outfit'));
  }

  frameIsland(isl, scale = 1.5, lift = 0.42) {
    const p = isl.home.clone().add(WORLD.islands);
    const dir = isl.home.clone().setY(0).normalize().setY(lift);
    const look = p.clone().add(V(0, 1.5, 0));
    return { pos: this.app.frameView(look, isl.radius * scale, dir), look };
  }

  transitLegend(kind) {
    const routes = kind === 'taiwan'
      ? [['#E56E2C', '高鐵 HSR', 'High-speed rail'], ['#236AA7', '台鐵 TRA', 'Taiwan Railway']]
      : [['#CC3C47', 'R 紅線', 'R Red Line'], ['#EF8D2E', 'O 橘線', 'O Orange Line'], ['#32875B', 'C 環狀輕軌', 'C Light rail'], ['#148BB5', 'F 鼓山 ⇄ 旗津', 'F Gushan ⇄ Cijin']];
    return el('div', { class: 'transit-guide' }, el('div', { class: 'transit-legend' }, routes.map(([color,zh,en]) => el('span', {}, el('i', { style: { background: color } }), I18N.lang === 'zh' ? zh : en))), el('small', {}, I18N.lang === 'zh' ? '路線為概念示意，非導航或完整站位圖' : 'Schematic routes, not a navigation or complete station map'));
  }

  chapterBody(data) {
    return [gallery(data.gallery || (data.photo ? [{src:data.photo,caption:data.title,credit:'義守大學'}] : [])), data.body ? el('p', { class: 'lead' }, t(data.body)) : null,
      data.timeline ? el('ol', { class: 'history-timeline' }, data.timeline.map(m => el('li', {}, el('b', {}, m.year), el('span', {}, t(m.label))))) : null,
      ...(data.sections || []).map(s => el('section', { class: 'chapter-section' }, el('h3', {}, t(s.title)), el('p', {}, t(s.body)))),
      data.cards ? el('div', { class: 'group-sectors' }, data.cards.map(c => el('div', {}, el('h3', {}, t(c.title)), el('p', {}, t(c.body))))) : null,
      data.links ? el('div', { class: 'chapter-links' }, data.links.map(l => link(t(l.label), l.url, { kind: 'quiet small' }))) : null,
    ].filter(Boolean);
  }

  updateHeartButton(button,key) {
    const [group,id]=key.split(':'),topic=LIKE_TOPICS[group]?.[id];
    if(!topic)return;
    const saved=this.s.likes.has(key),compact=button.classList.contains('topic-heart');
    button.classList.toggle('on',saved);button.setAttribute('aria-pressed',String(saved));
    button.setAttribute('aria-label',(saved?(I18N.lang==='zh'?'取消喜歡：':'Remove favourite: '):(I18N.lang==='zh'?'喜歡：':'Save favourite: '))+t(topic));
    button.replaceChildren(...[el('span',{class:'heart-icon','aria-hidden':'true'},saved?'♥':'♡'),compact?null:el('span',{},saved?(I18N.lang==='zh'?'已記下':'Saved'):(I18N.lang==='zh'?'喜歡':'Save'))].filter(Boolean));
    button.closest('.topic-choice')?.classList.toggle('saved',saved);
  }

  heartButton(group,id,compact=false) {
    const key=group+':'+id;this.s.likes ||= new Set();
    const button=el('button',{class:'heart-button'+(compact?' topic-heart':''),type:'button','data-like-key':key});
    this.updateHeartButton(button,key);
    button.addEventListener('click',()=>{
      if(this.s.likes.has(key))this.s.likes.delete(key);else this.s.likes.add(key);
      for(const node of this.ui.root.querySelectorAll(`[data-like-key="${key}"]`))this.updateHeartButton(node,key);
      sound.tap();
    });
    return button;
  }

  likeControl(group,id='overview') {
    if(!LIKE_TOPICS[group]?.[id])return null;
    return el('div',{class:'chapter-like-row'},el('p',{},I18N.lang==='zh'?'喜歡的就點愛心，清單上也能直接收藏。':'Tap a heart here or in the topic list to save what matters to you.'),this.heartButton(group,id));
  }

  topicChoices(group,topics,current,onChoose) {
    return el('div',{class:'topic-choices chips'},topics.map(topic=>el('div',{class:'topic-choice'+(this.s.likes.has(group+':'+topic.id)?' saved':''),'data-topic-id':topic.id},
      el('button',{class:'chip topic-open'+(current===topic?' on':''),type:'button',onclick:()=>onChoose(topic)},t(topic.title)),this.heartButton(group,topic.id,true))));
  }

  journeySummary(island=null,program=null,compact=false) {
    const rows=likedSummary(this.s.likes,I18N.lang);
    const life=LIFE_CARDS.find(c=>c.id===this.s.life);
    if(compact&&!rows.length)return null;
    return el('section',{class:'journey-summary'+(compact?' compact':''),'aria-label':I18N.lang==='zh'?'你的旅程小結':'Your journey summary'},
      el('h3',{},rows.length?(I18N.lang==='zh'?'你帶走的喜歡':'What you love about this journey'):(I18N.lang==='zh'?'你的新起點':'Your new starting point')),
      rows.length?el('ul',{},rows.map(row=>el('li',{},el('b',{},row.label+' · '),row.text))):el('p',{class:'note'},I18N.lang==='zh'?'還沒點愛心也沒關係，你已經替自己選了一個學習方向。':'No hearts saved yet — you have still chosen a direction to explore.'),
      life?el('p',{class:'summary-life'},el('b',{},I18N.lang==='zh'?'我想過的生活 · ':'Life I imagine · '),t(life.title)):null,
      island?el('p',{class:'summary-choice'},el('b',{},t(island.name)),program?' · '+studyPath(program,this.s.bridge).map(step=>t(step.name)).join(' → '):''):null,
      compact?null:el('p',{class:'summary-encouragement'},rows.length?t(JOURNEY_ENCOURAGEMENT):(I18N.lang==='zh'?'帶著好奇，讓這個選擇成為探索新生活的起點。':'Let curiosity turn this choice into the start of a new chapter.')));
  }

  // ---------- title ----------
  begin() {
    const app = this.app;
    app.setStage('campus');
    app.arch.islands.forEach((i) => app.arch.setLit(i, true, 0.01));
    let a = 0.6;
    const c = WORLD.islands;
    this.titleOrbit = (dt) => { a += dt * 0.05; app.camera.position.set(c.x + Math.cos(a) * 150, c.y + 26, c.z + Math.sin(a) * 150); app.look.copy(c).add(V(0, -14, 0)); app.camera.lookAt(app.look); };
    app.updaters.push(this.titleOrbit);
    this.view(() => this.titleScreen());
  }

  titleScreen() {
    this.narrator.setScene('intro');
    this.titleEl?.remove();
    const langSwitch = el('div', { class: 'lang-switch', role: 'group' },
      el('button', { class: I18N.lang === 'zh' ? 'on' : '', onclick: () => I18N.lang !== 'zh' && this.toggleLang() }, '中文'),
      el('button', { class: I18N.lang === 'en' ? 'on' : '', onclick: () => I18N.lang !== 'en' && this.toggleLang() }, 'English'));
    this.titleEl = el('section', { class: 'title' },
      el('img', { class: 'wordmark', src: 'assets/isu-wordmark.png', alt: '義守大學 I-Shou University' }),
      el('h1', {}, t(UI.title)),
      el('p', { class: 'sub' }, t(UI.subtitle)),
      el('div', { class: 'row' }, button(t(UI.start), () => this.leaveTitle(false), { iconName: 'arrow' }), button(t(UI.skip), () => this.leaveTitle(true), { kind: 'ghost' })),
      langSwitch,
      el('p', { class: 'meta' }, t(UI.minutes)),
    );
    this.ui.root.append(this.titleEl);
  }

  async leaveTitle(skip) {
    this.narrator.unlock();
    this.narrator.setScene(skip ? 'life' : 'globe');
    if (this.soundPref) { sound.start(); this.drawTopbar(); }
    this.titleEl.classList.add('out');
    setTimeout(() => this.titleEl.remove(), 900);
    this.render = null;
    this.app.updaters = this.app.updaters.filter((f) => f !== this.titleOrbit);
    if (skip) {
      await this.app.wipe(() => this.toCampus(true));
      return this.enterFuture();
    }
    this.setProgress(0);
    await this.app.wipe(() => { this.app.setStage('globe'); this.app.place(V(0, 0, 36), V(0, 0, 0)); });
    this.globeStep();
  }

  // ---------- prelude: globe ----------
  globeStep() {
    this.enter('globe', () => this.gotoPrelude('globe'));
    this.hideViews();
    this.narrator.setScene('globe');
    const app = this.app, g = app.globe;
    g.autoSpin = true;
    const choose = (country, ll) => {
      const home = country ? { lat: country.lat, lon: country.lon } : ll;
      this.s.country = country?.code ?? 'XX';
      this.s.home = home;
      this.s.homeLabelObj = country?.name ?? null;
      g.setHome(home.lat, home.lon);
      g.faceLatLon(home.lat - 26, home.lon, 1.2);
      const tr = this.placeTraveler(g.group, g.homePos.clone().multiplyScalar(1.005), 1.3);
      tr.group.quaternion.setFromUnitVectors(V(0, 1, 0), g.homePos.clone().normalize());
      tr.group.rotateY(Math.PI);
      tr.setLook(this.s.look);
      tr.setStage('traveler');
      tr.wave(2);
      this.homeLabels();
      this.render();
    };
    app.handlers = {
      globe: (ll) => {
        const near = COUNTRIES.map((c) => ({ c, d: haversineKm(c, ll) })).sort((a, b) => a.d - b.d)[0];
        choose(near.d < 900 ? near.c : null, ll);
      },
    };
    this.homeLabels = () => this.labels(() => {
      app.labels.hotspot('tw', g.taiwanMarker, t(UI.tw), null, { className: 'tag-only', facing: g.normalOf(g.taiwanPos) });

    });
    this.homeLabels();
    this.view(() => {
      const chips = COUNTRIES.map((c) => el('button', { class: 'chip' + (this.s.country === c.code ? ' on' : ''), 'data-country':c.code, type: 'button', onclick: () => choose(c) }, t(c.name)));
      chips.push(el('button', { class: 'chip' + (this.s.country === 'XX' ? ' on' : ''), type: 'button', onclick: () => this.ui.toast(t(UI.whereFromHint)) }, t(UI.otherPlace)));
      this.ui.panel({
        compact: true,
        eyebrow: t(UI.chapters[0]),
        title: t(UI.whereFrom),
        body: [el('p', { class: 'note' }, t(UI.whereFromHint)), el('div', { class: 'chips' }, chips), this.s.home ? el('div', { style: { marginTop: '16px' } }, this.lookPicker()) : null].filter(Boolean),
        foot: [button(t(UI.continue), () => this.takeOff(), { iconName: 'plane', disabled: !this.s.home })],
      });
    });
  }

  async takeOff() {
    const app = this.app;
    this.s.homeLabel = this.s.homeLabelObj ? t(this.s.homeLabelObj) : `${this.s.home.lat.toFixed(1)}°, ${this.s.home.lon.toFixed(1)}°`;
    this.ui.closePanel();
    this.render = null;
    app.handlers = { globeDrag: false };
    sound.whoosh(3.2);
    app.traveler.group.visible = false;
    app.globe.rider = app.globe.aircraft;
    app.traveler.mode = 'jump';
    await app.globe.flyHomeToTaiwan(app.camera);
    app.globe.rider = null;
    app.globe.aircraft.visible = false;
    await this.ui.caption(t(TAIWAN.line), 2600, { free: true });
    app.labels.clear();
    await app.wipe(() => this.toTaiwan());
    this.taiwanStep();
  }

  // ---------- prelude: Taiwan ----------
  toTaiwan() {
    const app = this.app;
    app.setStage('taiwan');
    app.skyEnv.setMood('day', 0.01);
    app.place(app.frameView(V(0, 0, 0), 34, V(0.3, 0.9, 0.75)), V(0, 0, 0));
  }

  taiwanStep() {
    this.hideMapTools();
    const app = this.app, T = WORLD.taiwan;
    if(!this.s.heartHintShown){this.s.heartHintShown=true;this.ui.toast(I18N.lang==='zh'?'喜歡的就點 ♡，最後串成你的旅程。':'Tap ♡ for the things you love. They will become part of your journey.');}
    this.enter('taiwan', () => this.gotoPrelude('taiwan'));
    this.exploreToken = (this.exploreToken || 0) + 1; app.orbit(false);
    const twHome = { pos: app.frameView(V(0, 0, 1), 20, V(0.22, 0.85, 0.55)), look: V(0, 0, 1) };
    this.showViews({ center: V(0, 0, 1), radius: 26, home: twHome });
    app.flyExplore(twHome.pos, twHome.look, 4.5);
    const seen = new Set();
    let detail = null;
    const a = app.tw.anchors;
    const tr = this.placeTraveler(app.tw.group, a.kaohsiung.clone().add(V(1.2, -6.3, 0.6)), 1.15, a.yushan.clone().add(T));
    tr.wave(2.5);
    this.labels(() => {
      this.youLabel(2.4);
      for (const k of TAIWAN.keywords) {
        app.labels.hotspot('kw-' + k.id, a[k.id].clone().add(T), t(k.title), (node) => { seen.add(k.id); node.classList.add('seen'); detail = k; this.render(); }, { className: 'prelude-topic' + (seen.has(k.id) ? ' seen' : '') });
      }
      app.labels.hotspot('hsr-taipei',a.hsrTaipei.clone().add(T),I18N.lang==='zh'?'高鐵 · 台北':'HSR · Taipei',null,{className:'tag-only rail-end'});
      app.labels.hotspot('hsr-zuoying',a.hsrZuoying.clone().add(T),I18N.lang==='zh'?'高鐵 · 左營':'HSR · Zuoying',null,{className:'tag-only rail-end'});
      app.labels.hotspot('yushan', a.yushan.clone().add(T), `${I18N.lang === 'zh' ? '玉山' : 'Yushan'} 3,952 m`, null, { className: 'tag-only' });
      app.labels.hotspot('khh', a.kaohsiung.clone().add(T), t(UI.khh) + ' →', () => this.leaveTaiwan(), {});
    });
    this.view(() => {
      this.narrator.setScene(detail ? 'taiwan-' + detail.id : 'taiwan');
      const body = detail
        ? [...this.chapterBody(detail), this.topicChoices('taiwan',TAIWAN.keywords,detail,k=>{detail=k;seen.add(k.id);this.render();})]
        : [this.topicChoices('taiwan',TAIWAN.keywords,detail,k=>{detail=k;seen.add(k.id);this.render();}), gallery(TAIWAN.gallery), el('p', { class: 'lead' }, t(TAIWAN.line)), this.transitLegend('taiwan'), el('ul', { class: 'timeline' }, TAIWAN.facts.map((f, i) => el('li', { style: { animationDelay: i * 0.08 + 's' } }, t(f)))), el('p', { class: 'note' }, t(UI.tapToExplore))];
      body.unshift(this.likeControl('taiwan',detail?.id||'overview'));
      this.ui.panel({
        key: 'taiwan-' + (detail?.id || 'overview'), compact: !detail, tall: !!detail, eyebrow: t(UI.chapters[0]), title: detail ? t(detail.title) : t(TAIWAN.title), body,
        foot: [detail ? this.backButton(() => { detail = null; this.render(); }) : this.backButton(), el('span', { class: 'spacer' }), button(t(UI.khh), () => this.leaveTaiwan(), { iconName: 'arrow' })].filter(Boolean),
      });
    });
  }

  async leaveTaiwan() {
    if (this.busy) return; this.busy = true;
    const app = this.app;
    this.ui.closePanel(); app.labels.clear(); this.render = null; this.hideViews();
    const k = app.tw.anchors.kaohsiung.clone().add(WORLD.taiwan);
    await app.fly(k.clone().add(V(4, 8, 10)), k.clone().add(V(0, -5, 0)), 2);
    await app.wipe(() => { app.setStage('kaohsiung'); app.place(app.frameView(WORLD.kaohsiung, 36, V(-0.1, 0.7, 1)), WORLD.kaohsiung.clone().add(V(0, 2, 0))); });
    this.busy = false;
    this.kaohsiungStep();
  }

  // ---------- prelude: Kaohsiung ----------
  kaohsiungStep() {
    this.hideMapTools();
    const app = this.app, K = WORLD.kaohsiung;
    this.enter('kaohsiung', () => this.gotoPrelude('kaohsiung'));
    this.exploreToken = (this.exploreToken || 0) + 1; app.orbit(false);
    this.khhView = () => app.frameView(K, 34, V(-0.45, 0.62, 0.75));
    this.showViews({ center: K.clone().add(V(0, 1, 0)), radius: 34, home: { pos: this.khhView(), look: K.clone().add(V(0, 1, 0)) } });
    app.flyExplore(this.khhView(), K.clone().add(V(0, 1, 0)), 5);
    let detail = null;
    const seen = new Set();
    const tr = this.placeTraveler(app.khh.group, V(-3, 0.2, 7.5), 1.7, K.clone().add(V(0, 0, -10)));
    tr.wave(2);
    this.labels(() => {
      this.youLabel(2.5);
      app.labels.hotspot('sizihwan',app.khh.anchors.sizihwan.clone().add(K),I18N.lang==='zh'?'西子灣':'Sizihwan',()=>{detail=KAOHSIUNG_STAGE.spots.find(s=>s.id==='mountains');this.render();this.peek(K,app.khh.anchors.mountains);},{className:'prelude-topic'});
      app.labels.hotspot('hamasen',app.khh.anchors.hamasen.clone().add(K),I18N.lang==='zh'?'哈瑪星':'Hamasen',null,{className:'tag-only'});
      for (const s of KAOHSIUNG_STAGE.spots) {
        app.labels.hotspot('spot-' + s.id, app.khh.anchors[s.id].clone().add(K), t(s.title), (node) => { seen.add(s.id); node.classList.add('seen'); detail = s; this.render(); this.peek(K, app.khh.anchors[s.id]); }, { className: 'prelude-topic' + (seen.has(s.id) ? ' seen' : '') });
      }
    });
    this.view(() => {
      this.narrator.setScene(detail ? 'kaohsiung-' + detail.id : 'kaohsiung');
      const body = detail
        ? [...this.chapterBody(detail), this.transitLegend('kaohsiung'), this.topicChoices('kaohsiung',KAOHSIUNG_STAGE.spots,detail,s=>{detail=s;seen.add(s.id);this.render();this.peek(K,app.khh.anchors[s.id]);})]
        : [gallery(KAOHSIUNG_STAGE.gallery), el('p', { class: 'lead' }, t(KAOHSIUNG_STAGE.line)), this.transitLegend('kaohsiung'), this.topicChoices('kaohsiung',KAOHSIUNG_STAGE.spots,detail,s=>{detail=s;seen.add(s.id);this.render();this.peek(K,app.khh.anchors[s.id]);})];
      body.unshift(this.likeControl('kaohsiung',detail?.id||'overview'));
      this.ui.panel({
        key: 'khh-' + (detail?.id || 'overview'), compact: !detail, tall: !!detail, eyebrow: t(UI.chapters[0]), title: detail ? t(detail.title) : t(KAOHSIUNG_STAGE.title), body,
        foot: [detail ? this.backButton(() => { detail = null; this.render(); app.flyExplore(this.khhView(), K.clone().add(V(0, 1, 0)), 1.8); }) : this.backButton(), el('span', { class: 'spacer' }), button(t(UI.guanyin), () => this.leaveKaohsiung(), { iconName: 'arrow' })].filter(Boolean),
      });
    });
  }

  peek(origin, anchor) {
    const p = anchor.clone().add(origin);
    this.app.traveler.face(p);
    this.app.traveler.wave(1.2);
    const dir = p.clone().sub(origin).setY(0).normalize();
    if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);
    this.app.flyExplore(p.clone().addScaledVector(dir, 22).add(V(0, 12, 0)).add(V(dir.z * 8, 0, -dir.x * 8)), p.clone().add(V(0, -3, 0)), 1.8);
  }

  async leaveKaohsiung() {
    if (this.busy) return; this.busy = true;
    const app = this.app;
    this.ui.closePanel(); app.labels.clear(); this.render = null; this.hideViews();
    await app.wipe(() => this.toCampus(false));
    this.busy = false;
    this.campusStep();
  }

  // ---------- prelude: Guanyin Mountain ----------
  toCampus(skipping) {
    const app = this.app, C = WORLD.campus;
    app.setStage('campus');
    app.arch.islands.forEach((i) => app.arch.setLit(i, false, 0.01));
    if (!skipping) app.arch.group.visible = false;
    if (skipping) app.place(app.frameView(C.clone().add(V(0, 28, 0)), 14, V(0, 0.08, 1)), C.clone().add(V(0, 28, 0)));
    else app.place(app.frameView(C, 42, V(0.6, 0.45, 0.8)), C.clone().add(V(0, 3, 0)));
  }

  campusSpot() {
    const m = this.app.campus.anchors.main;
    const x=m.x+1.2,z=m.z+3.6;
    return V(x,this.app.campus.surfaceY(x,z)+0.05,z);
  }

  // traveler waits on campus in front of the administration building
  travelerToCampus() {
    const tr = this.placeTraveler(this.app.campus.group, this.campusSpot(), 1.6);
    if (tr.stage === 'traveler') tr.setStage('student');
    tr.face(WORLD.islands);
    return tr;
  }

  campusStep() {
    this.hideMapTools();
    const app = this.app, C = WORLD.campus;
    this.enter('campus', () => this.gotoPrelude('campus'));
    this.exploreToken = (this.exploreToken || 0) + 1; app.orbit(false);
    this.campusView = () => app.frameView(C.clone().add(V(13, 0, 6)), 40, V(0.35, 0.5, 0.85));
    this.showViews({ center: C.clone().add(V(10, 0, 5)), radius: 42, home: { pos: this.campusView(), look: C.clone().add(V(13, 0, 6)) } });
    app.flyExplore(this.campusView(), C.clone().add(V(13, 0, 6)), 4.5);
    const showSpot = s => { if(s.id === 'main') {const look=C.clone().add(V(-2,2,0));app.flyExplore(app.frameView(look,28,V(0.3,0.75,1)),look,1.8);} else this.peek(C,anchors[s.id]); };
    let detail = null;
    const seen = new Set();
    const anchors = app.campus.anchors;
    const tr = this.placeTraveler(app.campus.group, this.campusSpot(), 1.6, C.clone().add(V(-3.5, 4, 0)));
    setTimeout(() => {
      if (tr.stage !== 'traveler') return;
      tr.setStage('student'); tr.cheer(1.8); sound.badge(); this.ui.toast(t(UI.becameStudent));
    }, 3600);
    this.labels(() => {
      this.youLabel(2.4);
      if (detail?.id === 'main') {
        const names={admin:['行政大樓','Administration'],engineering:['理工大樓','Science & Engineering'],technology:['科技大樓','Science & Technology'],teaching:['綜合教學大樓','Teaching Building'],international:['國際學院','International College'],dorms:['宿舍區','Dormitories'],mall:['義大購物廣場','E-Da Outlet Mall'],hotels:['飯店生活圈','Hotels']};
        for(const [id,anchor] of Object.entries(app.campus.buildings)) app.labels.hotspot('building-'+id,anchor.clone().add(C),names[id][I18N.lang==='zh'?0:1],null,{className:'tag-only campus-building'});
        return;
      }
      for (const s of CAMPUS.spots) {
        app.labels.hotspot('c-' + s.id, anchors[s.id].clone().add(C), t(s.title), (node) => { seen.add(s.id); node.classList.add('seen'); detail = s; this.render(); showSpot(s); }, { className: 'prelude-topic' + (seen.has(s.id) ? ' seen' : '') });
      }
    });
    this.view(() => {
      this.narrator.setScene(detail ? 'campus-' + detail.id : 'campus');
      const chips = this.topicChoices('campus',CAMPUS.spots,detail,s=>{detail=s;seen.add(s.id);this.render();showSpot(s);});
      const body = detail ? [...this.chapterBody(detail), chips] : [chips, gallery(CAMPUS.gallery), el('p', { class: 'lead' }, t(CAMPUS.line)), el('p', { class: 'note' }, I18N.lang === 'zh' ? '3D 為空間關係示意。點開校本部可看官方平面圖與建築說明。' : 'The 3D view is schematic. Open Main campus for the official plan and building guide.')];
      this.relabel?.();
      body.unshift(this.likeControl('campus',detail?.id||'overview'));
      this.ui.panel({
        key: 'campus-' + (detail?.id || 'overview'), compact: !detail, tall: !!detail, eyebrow: t(UI.chapters[0]), title: detail ? t(detail.title) : t(CAMPUS.title), body,
        foot: [detail ? this.backButton(() => { detail = null; this.render(); app.flyExplore(this.campusView(), C.clone().add(V(13, 0, 6)), 1.8); }) : this.backButton(), el('span', { class: 'spacer' }), button(t(UI.continue), () => this.revealIslands(), { iconName: 'arrow' })].filter(Boolean),
      });
    });
  }

  async revealIslands() {
    if (this.busy) return; this.busy = true;
    const app = this.app;
    this.narrator.stop();
    this.ui.closePanel(); app.labels.clear(); this.render = null; this.hideViews();
    app.arch.rise(3.0); app.arch.lightAll(true);
    const look=WORLD.islands.clone().add(V(0,-6,0));
    await app.fly(app.frameView(look,62,V(0,0.95,1)),look,3.0);
    this.busy = false;
    this.enterFuture(false);
  }

  enterFuture(fly = true) {
    const app=this.app;
    app.arch.group.visible=true;
    app.arch.lightAll(true);
    app.skyEnv.setMood('golden',2);
    this.travelerToCampus().setStage('student');
    if(fly) {const look=WORLD.islands.clone().add(V(0,-6,0));app.fly(app.frameView(look,62,V(0,0.95,1)),look,2.2);}
    this.lifeStep();
  }

  async restart() {
    if(this.restarting) return;
    this.restarting=true;
    this.narrator.userPaused=true;
    this.app.handlers={};
    await this.narrator.stop();
    sound.stop();
    window.speechSynthesis?.cancel();
    location.reload();
  }

  // ---------- chapter 1: future ----------
  hideMapTools() { this.mapToolsEl?.remove();this.mapToolsEl=null; }

  showMapTools() {
    this.hideMapTools();
    this.mapToolsEl=el('div',{class:'map-tools','aria-label':I18N.lang==='zh'?'島嶼視角':'Island views'},
      button(I18N.lang==='zh'?'鳥瞰所有島嶼':'Bird’s-eye map',()=>this.birdsEye(),{kind:'quiet small',iconName:'globe'}),
      this.focusedIsland?button(I18N.lang==='zh'?'回到這座島':'Back to this island',()=>this.focusIsland(this.focusedIsland.id,this.focusedIsland.programId||false),{kind:'quiet small'}):null);
    this.ui.root.append(this.mapToolsEl);
  }

  async birdsEye() {
    const app=this.app;const token=this.exploreToken=(this.exploreToken||0)+1;
    app.orbit(false);const target=WORLD.islands.clone().add(V(0,-3,0));
    if(this.s.mapFilter&&this.s.mapFilter!=='all')this.mapConnections(this.s.mapFilter);
    this.islandLabels(id=>id==='ifp-stop'?this.pathwayStep('ifp',this.render):this.focusIsland(id),{mapFilter:this.s.mapFilter||'all'});
    app.labels.hotspot('map-ifp',app.arch.foundation.anchorObj,I18N.lang==='zh'?'IFP 華語島':'IFP Mandarin',()=>this.pathwayStep('ifp',this.render),{className:'island foundation',noStem:true});
    if(!this.viewCfg)this.islandsView();
    await app.flyExplore(app.frameView(target,64,V(0,1,.055)),target,1.3);
  }

  mapConnections(filter,scope=null) {
    this.s.mapFilter=filter;
    const rows=ISLANDS.flatMap(i=>(!scope||i.id===scope)?i.programs.filter(p=>filter==='ready'?programStatus(p,this.s).ready:matchesConnectionFilter(p,filter)).map(p=>({islandId:i.id,programId:p.id})):[]);
    if(filter==='all'){
      this.app.arch.clearConnections();
      if(this.s.bridge)this.app.arch.showBridge(this.s.bridge,this.bridgeFrom());else this.app.arch.clearBridges();
    } else this.app.arch.showProgramConnections(rows,{filter:filter==='ready'?this.s.bridge:filter});
    return rows.length;
  }

  connectionControls(onSelect=null,scope=null) {
    const current=this.s.mapFilter||'all';
    return el('section',{class:'connection-controls'},el('p',{class:'note'},I18N.lang==='zh'?'點一下看課程連線；這是路徑預覽，不會變更你的申請背景。':'Tap to preview program connections. This does not change your admission background.'),
      el('div',{class:'chips'},[['all','全部','All'],['zh','中文課程','Chinese'],['en','英文課程','English'],['ifp','IFP 銜接','IFP links']].map(([id,zh,en])=>el('button',{class:'chip'+(current===id?' on':''),type:'button','data-map-filter':id,'aria-pressed':String(current===id),onclick:()=>{this.mapConnections(id,scope);onSelect?.(id);if(!scope)this.birdsEye();}},I18N.lang==='zh'?zh:en))));
  }

  islandLabels(onClick, { dimUnreached = false, mapFilter = 'all' } = {}) {
    const app = this.app;
    this.labels(() => {
      for (const isl of app.arch.islands) {
        const matched=isl.def.programs.filter(p=>matchesConnectionFilter(p,mapFilter));
        const reached = mapFilter!=='all'?matched.length>0:!this.s.bridge || isl.def.programs.some((p) => dimUnreached ? programStatus(p, this.s).ready : programReachable(p, this.s.bridge));
        const cls = 'island' + (isl.def.id === this.s.interest ? ' target' : '') + ((dimUnreached||mapFilter!=='all') && !reached ? ' dim' : '') + (this.s.visited.has(isl.def.id) ? ' seen' : '');
        app.labels.hotspot('i-' + isl.def.id, isl.anchorObj, t(isl.def.name), onClick ? () => onClick(isl.def.id) : null, { className: cls, small: mapFilter!=='all'?String(matched.length)+(I18N.lang==='zh'?' 個課程':' programs'):isl.def.id === this.s.interest ? t(UI.firstStop) : null, noStem: true });
      }
    });
  }

  interestStep() {
    const app=this.app;
    this.exploreToken=(this.exploreToken||0)+1;const token=this.exploreToken;
    this.enter('learning', () => this.interestStep());
    this.setProgress(1);app.orbit(false);
    const pick=id=>{
      if(id==='ifp-stop'){this.pathwayStep('ifp',()=>this.interestStep());return;}
      this.s.interest=id;this.s.pendingIsland=id;this.s.pendingProgram=null;
      sound.select();this.focusIsland(id);
    };
    app.handlers={island:pick,program:(id,pid)=>{this.s.interest=id;this.s.pendingIsland=id;this.focusIsland(id,pid);}};
    this.focusedIsland=null;this.showMapTools();this.mapConnections(this.s.mapFilter||'all');this.islandLabels(pick,{mapFilter:this.s.mapFilter||'all'});
    app.labels.hotspot('ifp-entry',app.arch.foundation.anchorObj,I18N.lang==='zh'?'IFP 華語島':'IFP Mandarin',()=>this.pathwayStep('ifp',this.render),{className:'island foundation',noStem:true});
    app.arch.lightAll(true);
    const home=this.islandsView();
    app.flyExplore(home.pos,home.look,1.8);
    this.view(()=>{
      this.narrator.setScene('learning');
      const life=LIFE_CARDS.find(c=>c.id===this.s.life);
      this.ui.panel({key:'learning-islands',tall:true,eyebrow:t(UI.chapters[1]),title:t(UI.learningPick),body:[
        life?el('p',{class:'route-current'},t(UI.life)+' · '+t(life.title)):null,
        el('p',{class:'lead'},t(UI.futureTitle)),this.connectionControls(()=>this.render()),
        el('div',{class:'options'},ISLANDS.map(isl=>el('button',{class:'option',type:'button','data-island-id':isl.id,onclick:()=>pick(isl.id)},el('span',{class:'dot',style:{background:isl.color}},t(isl.name).slice(0,1)),el('span',{},el('div',{class:'t'},t(isl.name)),el('div',{class:'s'},t(isl.industry)+(this.s.mapFilter&&this.s.mapFilter!=='all'?' · '+isl.programs.filter(p=>matchesConnectionFilter(p,this.s.mapFilter)).length+(I18N.lang==='zh'?' 個連線課程':' linked programs'):''))),el('span',{class:'chev'},'›')))),
        this.pathwayCards(),el('p',{class:'note'},I18N.lang==='zh'?'現在是島嶼預覽：先了解科系，不必先回答入學問題。':'This is an island preview. Explore the programs before answering admission questions.'),
      ].filter(Boolean),foot:[this.backButton()].filter(Boolean)});
    });
  }

  lifeStep() {
    this.hideMapTools();this.app.arch.clearConnections();
    const app=this.app;
    this.exploreToken=(this.exploreToken||0)+1;
    this.enter('life', () => this.lifeStep());
    this.setProgress(1);app.handlers={};app.labels.clear();app.orbit(false);
    this.islandsView();
    this.view(()=>{
      this.narrator.setScene('life');
      this.ui.panel({key:'life',tall:true,eyebrow:t(UI.chapters[1]),title:t(UI.lifePick),body:[
        el('p',{class:'lead'},I18N.lang==='zh'?'先想像你想過的生活，再去找讓你好奇的學習領域。現在還不確定，也可以繼續探索。':'Imagine the life you want, then explore the fields that make you curious. You can keep exploring even if you are not sure yet.'),
        el('div',{class:'options'},LIFE_CARDS.map((c,i)=>el('button',{class:'option'+(this.s.life===c.id?' on':''),type:'button','data-life-id':c.id,onclick:()=>{this.s.life=c.id;this.render();}},el('span',{class:'dot',style:{background:['#36348E','#E07A5F','#3E9E86','#F29A8E','#8A93B8'][i]}},String(i+1)),el('span',{},el('div',{class:'t'},t(c.title))),el('span',{class:'chev'},'›')))),
      ],foot:[this.backButton(),el('span',{class:'spacer'}),button(I18N.lang==='zh'?'看看想學的領域':'Explore fields of study',()=>this.interestStep(),{iconName:'arrow',disabled:!this.s.life})].filter(Boolean)});
    });
  }

  arriveAfterBridge() {
    const id=this.s.pendingIsland||this.s.interest;
    const island=ISLANDS.find(i=>i.id===id);
    if(island && island.programs.some(p=>programStatus(p,this.s).ready)) {
      const selected=island.programs.find(p=>p.id===this.s.pendingProgram);
      this.focusIsland(id,selected&&programStatus(selected,this.s).ready?selected.id:false);
      this.ui.toast(I18N.lang==='zh'?'橋已接上，亮燈科系可以繼續選擇與定錨。':'Your bridge is connected. Explore the lit programs and anchor your choice.');
    } else {
      this.islandsStep();
      this.ui.toast(I18N.lang==='zh'?'目前這座橋有其他可到達的課程，看看哪些島亮起來。':'This bridge reaches other programs. Look for the islands that light up.');
    }
  }

  async selectBridge(kind,direct=false) {
    if(!routeEligible(kind,this.s))return;
    this.hideMapTools();
    this.exploreToken=(this.exploreToken||0)+1;
    this.s.bridge=kind;this.previewBridge=null;this.s.mapFilter='all';this.app.arch.clearConnections();
    this.app.arch.showBridge(kind,this.bridgeFrom());sound.bridge();
    if(direct && kind==='ifp') {
      const island=this.app.arch.foundation,f=this.frameIsland(island,1.7,.8);
      this.ui.closePanel();this.render=null;this.narrator.stop();
      this.placeTraveler(island.group,this.landing(island),1.65).setStage('student');
      await this.app.fly(f.pos,f.look,1.1);return this.arriveAfterBridge();
    }
    if(direct)return this.arriveAfterBridge();
    if(kind==='ifp'||kind==='intense')this.pathwayStep(kind,()=>this.arriveAfterBridge(),true,()=>this.arriveAfterBridge());
    else this.arriveAfterBridge();
  }

  choosePathway(kind) {
    this.s.routeIntent=kind;this.s.answers.route=kind==='ifp'?'mandarin':'industry';
    this.s.bridge=null;this.s.primary=null;this.previewBridge=null;
    const a=this.s.answers;
    if(this.s.country&&a.edu&&a.lang&&a.bg&&routeEligible(kind,this.s))return this.selectBridge(kind,true);
    this.bridgeStep();
  }

  // ---------- chapter 2: bridge ----------
  bridgeFrom() { return WORLD.campus.clone().add(V(-3.5, 10, 4)); }

  async bridgeStep() {
    this.hideMapTools();this.app.arch.clearConnections();
    this.enter('bridge', () => this.bridgeStep());
    const token=this.exploreToken=(this.exploreToken||0)+1;
    const app = this.app, C = WORLD.campus;
    this.narrator.stop();this.ui.closePanel();this.render=null;
    this.setProgress(2);
    app.labels.clear(); app.handlers = {};
    app.arch.setBeacon(null, false); this.travelerToCampus();
    const bridgeHome = { pos: C.clone().add(V(70, 34, 120)), look: C.clone().add(V(0, 26, 0)) };
    this.showViews({ center: C.clone().add(V(0, 24, 0)), radius: 70, home: bridgeHome, onBird: () => this.birdsEye() });
    await app.flyExplore(bridgeHome.pos, bridgeHome.look, 2.0);
    if(token!==this.exploreToken)return;
    let result = !!this.s.bridge;
    const answers = this.s.answers;
    this.view(() => {
      const preview = this.previewBridge || this.s.bridge || this.s.primary;
      this.narrator.setScene(result ? 'bridge-' + preview : 'bridges');
      if (!result) {
        const countryPick = el('div', { class: 'qblock' }, el('p', { class: 'qt' }, t(UI.whereFrom)), el('div', { class: 'chips' }, [...COUNTRIES, { code: 'XX', name: { zh: '其他地區', en: 'Another place' } }].map(c => el('button', { class: 'chip' + (this.s.country === c.code ? ' on' : ''), 'data-country':c.code, type: 'button', 'aria-pressed': String(this.s.country === c.code), onclick: () => { this.s.country = c.code; if (c.lat != null) this.s.home = { lat: c.lat, lon: c.lon }; this.s.homeLabel = t(c.name); this.s.homeLabelObj = c.name; this.render(); } }, t(c.name)))));
        const questions=QUESTIONS;
        const blocks = questions.map(q => el('div', { class: 'qblock', 'data-question':q.id }, el('p', { class: 'qt' }, t(q.title)), el('div', { class: 'chips' }, q.options.map(o => el('button', { class: 'chip' + (answers[q.id] === o.id ? ' on' : ''), 'data-answer':o.id, type: 'button', 'aria-pressed': String(answers[q.id] === o.id), onclick: () => { answers[q.id] = o.id; if (q.id === 'route') this.s.routeIntent = o.id === 'mandarin' ? 'ifp' : o.id === 'industry' ? 'intense' : null; this.render(); } }, t(o.label)))), q.id === 'route' ? el('div', { class: 'route-learn' }, el('span', {}, I18N.lang === 'zh' ? '想先了解：' : 'Learn more: '), el('button', { type: 'button', onclick: () => this.pathwayStep('ifp') }, 'IFP'), el('button', { type: 'button', onclick: () => this.pathwayStep('intense') }, 'INTENSE')) : null));
        const requested=this.s.routeIntent||(answers.route==='industry'?'intense':answers.route==='mandarin'?'ifp':null);
        const complete=questions.every(q=>answers[q.id])&&this.s.country;
        const allowed=!complete||!requested||routeEligible(requested,this.s);
        const done=complete&&allowed;
        const requirement=complete&&requested&&!allowed?el('p',{class:'note route-note'},requested==='ifp'?(I18N.lang==='zh'?'目前的回答不符合 IFP 的身分或來台經歷條件，可以改選其他學習路徑。':'Your answers don’t match the IFP background or previous-Taiwan-study conditions. Try another study route.'):(I18N.lang==='zh'?'INTENSE 需符合招生國家、D3 以上學歷，以及英語（設備工程）或中文（機械與自動化）授課能力。':'INTENSE needs an eligible country, a D3 or higher credential, and English (Equipment Eng.) or Chinese (Mechanical & Automation) study ability.')):null;
        this.ui.panel({ key: 'bridge-questions', tall: true, eyebrow: t(UI.chapters[2]), title: t(UI.bridgeTitle),
          body: [el('p',{class:'lead'},t(ADMISSION_INTRO)),el('p',{class:'route-current'},I18N.lang==='zh'?'你的出發點 → 入學橋 → 科系':'Your starting point → Admission bridge → Program'), countryPick, ...blocks, requirement].filter(Boolean),
          foot: [this.backButton(), el('span', { class: 'spacer' }), button(this.s.routeIntent?(I18N.lang==='zh'?'確認起點，採用這條路':'Confirm my starting point'):t(UI.bridgeTitle), () => {
            if(this.s.routeIntent&&routeEligible(this.s.routeIntent,this.s)){this.selectBridge(this.s.routeIntent,true);return;}
            Object.assign(this.s, resolveBridge(answers, this.s.country));
            this.previewBridge = this.s.primary; result = true; app.arch.showBridge(this.s.primary, this.bridgeFrom()); sound.bridge(); this.render();
          }, { iconName: 'arrow', disabled: !done })],
        });
        return;
      }
      const b = BRIDGES[preview];
      const canUse = routeEligible(preview, this.s);
      const notice = !canUse ? (I18N.lang === 'zh' ? '目前回答未符合此路徑的初步身分或學歷條件。可閱讀內容，或重新回答。' : 'Your answers do not match the initial background or education screen for this route. Explore it, or change your answers.') : (I18N.lang === 'zh' ? '這是路徑初篩。正式資格、語言證明與錄取結果，依當期簡章與審查。' : 'This is an initial route screen. Formal eligibility, evidence and admission follow the current prospectus.');
      this.ui.panel({ key: 'bridge-result-' + preview, tall: true, eyebrow: t(UI.chapters[2]), title: t(UI.bridgeTitle), body: [
        el('div', { class: 'bridge-card', style: { background: `linear-gradient(135deg, ${b.color}, ${b.color}cc)` } }, el('p', { class: 'bt' }, (preview===this.s.bridge||preview===this.s.primary) ? t(UI.yourBridge) : t(UI.otherBridges)), el('p', { class: 'bn' }, t(b.name)), el('p', { class: 'bt' }, t(b.tag)), el('p', {}, t(b.who)), el('p', {}, t(b.how))),
        el('p', { class: 'note' }, notice), el('p', { class: 'note' }, t(b.chinese)),
        b.rule ? el('p', { class: 'note' }, t(b.rule)) : null,
        this.s.needLanguage ? el('p', { class: 'note' }, t(UI.needLanguage)) : null,
        this.pathwayCards(),
        el('h3', {}, t(UI.otherBridges)), el('div', { class: 'mini-bridges' }, Object.entries(BRIDGES).map(([k, value]) => el('button', { class: 'mini-bridge' + (preview === k ? ' on' : ''), type: 'button', 'aria-pressed': String(preview === k), style: { color: value.color }, onclick: () => { this.previewBridge = k; app.arch.showBridge(k, this.bridgeFrom()); this.render(); } }, el('i', { style: { background: value.color } }), el('span', { style: { color: '#23215F' } }, t(value.name), k === this.s.primary ? ' ★' : '')))),
        link(I18N.lang === 'zh' ? '官方路徑說明' : 'Official route information', b.infoUrl),
      ], foot: [this.backButton(() => { result = false; this.s.bridge = null; this.previewBridge = null; app.arch.clearBridges(); this.render(); }), el('span', { class: 'spacer' }),
        button(I18N.lang === 'zh' ? '沿這座橋找課程' : 'Find programs across this bridge', () => { this.selectBridge(preview); }, { iconName: 'arrow', disabled: !canUse })],
      });
    });
    this.showDock();
  }

  pathwayCards() {
    const back = this.render;
    const cards = el('div', { class: 'pathway-cards' }, ...['ifp', 'intense'].map(k => el('button', { class: 'pathway-card', type: 'button', onclick: () => this.pathwayStep(k, back) }, el('span', { class: 'pathway-symbol', 'aria-hidden': 'true' }, k === 'ifp' ? '文' : '⚙'), el('span', {}, el('strong', {}, k === 'ifp' ? (I18N.lang === 'zh' ? '先學中文的華語島' : 'Mandarin foundation island') : (I18N.lang === 'zh' ? '企業合作 · INTENSE' : 'Industry partnership · INTENSE')), el('small', {}, k === 'ifp' ? (I18N.lang === 'zh' ? '1 年先修 → 13 個銜接科系' : '1 foundation year → 13 degree choices') : (I18N.lang === 'zh' ? '在校 → 企業實習 → 依約就業' : 'Campus → Internship → Employment'))))));
    return el('section', { class:'other-options', 'aria-label':'Other Options' },el('h3',{},'Other Options'),el('p',{class:'note'},I18N.lang==='zh'?'先學華語，或走企業合作的入學路徑。':'Explore Mandarin preparation or an industry partnership route.'),cards);
  }

  pathwayStep(kind, back = () => this.islandsStep(), travel = false, onContinue = null) {
    this.enter('pathway:' + kind, () => this.pathwayStep(kind, back, travel, onContinue));
    const b = BRIDGES[kind],app=this.app;
    const previous={pos:app.camera.position.clone(),look:app.look.clone(),handlers:app.handlers,orbit:app.controls.enabled,relabel:this.relabel,hadLabels:app.labels.items.size>0,filter:this.s.mapFilter||'all'};
    this.s.mapFilter=kind;this.mapConnections(kind);this.showMapTools();
    if(!travel)this.birdsEye();
    if (travel && kind === 'ifp') {
      this.exploreToken = (this.exploreToken || 0) + 1;
      const isl = this.app.arch.foundation, f = this.frameIsland(isl, 1.5, 0.5);
      this.app.orbit(false); this.showViews({ center: f.look, radius: isl.radius * 1.8, home: { pos: f.pos, look: f.look }, onBird: () => this.birdsEye() }); this.app.flyExplore(f.pos, f.look, 1.8);
      this.placeTraveler(isl.group, this.landing(isl), 1.5).setStage('student');
      this.labels(() => this.app.labels.hotspot('ifp-stop', isl.anchorObj, I18N.lang === 'zh' ? '先修年 · TOCFL A2' : 'Foundation year · TOCFL A2', null, { className: 'tag-only' }));
    }
    const restore=()=>{const token=this.exploreToken=(this.exploreToken||0)+1;this.s.mapFilter=previous.filter;app.arch.clearConnections();app.labels.clear();app.handlers=previous.handlers;this.render=back;back?.();if(token!==this.exploreToken)return;if(previous.hadLabels)previous.relabel?.();app.fly(previous.pos,previous.look,1.2).then(()=>{if(previous.orbit&&token===this.exploreToken)app.orbit(true,{target:previous.look,min:14,max:340,minPolar:.025,maxPolar:1.35});});};
    this.view(() => {
      this.narrator.setScene('bridge-' + kind);
      const programs = ISLANDS.flatMap(i => i.programs.filter(p => p.bridges.includes(kind)).map(p => ({ i, p })));
      const partners = ['ASE · 日月光', 'Tong Yang · 東陽', 'Sinpro · 星博電子', 'Honxin · 洪興研磨', 'Shyh Hwa · 世華金屬'];
      this.ui.panel({ key: 'pathway-' + kind, tall: true, eyebrow: t(b.tag), title: kind === 'ifp' ? (I18N.lang === 'zh' ? '華語先修島' : 'Mandarin foundation island') : (I18N.lang === 'zh' ? '從企業需求出發' : 'A route connected to industry'), body: [
        photo(kind === 'ifp' ? META.ifpPhoto : 'assets/photos/ai-center.webp', t(b.tag)), el('p', { class: 'lead' }, t(b.how)),
        el('div', { class: 'route-ribbon' }, ...(kind === 'ifp' ? [I18N.lang === 'zh' ? '1 年 · 720 小時華語' : '1 year · 720 hours Mandarin', 'TOCFL A2', I18N.lang === 'zh' ? '4 年 · 核定學士班' : '4-year approved degree'] : [I18N.lang === 'zh' ? '申請與企業媒合' : 'Application & company matching', I18N.lang === 'zh' ? '1 年在校' : '1 year on campus', I18N.lang === 'zh' ? '1 年企業實習' : '1 year internship', I18N.lang === 'zh' ? '依約在台工作' : 'Employment agreement']).map(text => el('span', {}, text))),
        kind==='intense'?el('p',{class:'note'},I18N.lang==='zh'?'兩個專班：設備工程（英語授課，CEFR B1 以上）與機械與自動化工程（中文授課，TOCFL A2 以上）。':'Two programs: Equipment Engineering (English-taught, CEFR B1+) and Mechanical & Automation Engineering (Chinese-taught, TOCFL A2+).'):null,
        el('p', { class: 'note' }, t(b.who)), el('p', { class: 'note' }, t(b.chinese)), b.rule ? el('p', { class: 'note' }, t(b.rule)) : null,
        kind === 'ifp' ? el('p', { class: 'note' }, I18N.lang === 'zh' ? '先修不是獨立學位；銜接核定科系須符合語言與修業規定，並非先修後可任選全校科系。' : 'The foundation year is not a degree. Progression is to approved programs under language and study rules, rather than unrestricted access to every department.') : el('div', {}, el('h3', {}, I18N.lang === 'zh' ? '官網列示的合作企業' : 'Partners listed on the official site'), el('div', { class: 'chips partner-list' }, partners.map(name => el('span', { class: 'tag' }, name))), el('p', { class: 'note' }, I18N.lang === 'zh' ? '企業名單是整體計畫資訊；個人媒合、當期名額、津貼與工作義務，需依簡章及簽訂契約確認。' : 'These are program-level partners. Individual matching, places, allowances and obligations follow the intake prospectus and signed agreement.')),
        el('h3', {}, kind === 'ifp' ? (I18N.lang === 'zh' ? '華語島之後，這 13 個科系' : 'After Mandarin: 13 degree choices') : (I18N.lang === 'zh' ? '2026–2027 的兩個專班' : 'The two 2026–27 programs')),
        el('div', { class: 'programs' }, programs.map(({i,p}) => el('button', { class: 'program', type: 'button', onclick: () => { this.s.interest=i.id;this.s.pendingIsland=i.id;this.focusIsland(i.id,p.id); } }, el('span', { class: 'pn' }, t(p.name)), el('span', { class: 'pf' }, t(i.name) + ' · ' + t(p.focus))))),
        link(I18N.lang === 'zh' ? '官方完整說明' : 'Official details', b.infoUrl),
        kind === 'intense' ? link(I18N.lang === 'zh' ? '2027 春季招生簡章' : 'Spring 2027 prospectus', b.prospectusUrl) : null,
      ].filter(Boolean), foot: [this.backButton(), el('span', { class: 'spacer' }), !travel?button(kind==='ifp'?(I18N.lang==='zh'?'選擇 IFP 這條路':'Choose the IFP route'):(I18N.lang==='zh'?'選擇 INTENSE 這條路':'Choose the INTENSE route'),()=>this.choosePathway(kind),{iconName:'arrow'}):null, travel ? button(I18N.lang === 'zh' ? '前往科系群島' : 'Go to the degree islands', () => onContinue?onContinue():this.islandsStep(), { iconName: 'arrow' }) : null].filter(Boolean) });
    });
  }

  // ---------- support dock ----------
  showDock() {
    this.dockOn = true;
    this.ui.dock([
      { label: I18N.lang === 'zh' ? '入學路徑' : 'Pathways', onClick: () => { const back = this.render; this.pathwayStep(this.s.bridge === 'intense' ? 'intense' : 'ifp', back); } },
      { label: t(UI.scholarship), onClick: () => this.support('scholarship') },
      { label: t(UI.dorm), onClick: () => this.support('dorm') },
      { label: t(UI.tower), onClick: () => this.support('tower') },
    ]);
  }

  support(kind) {
    this.narrator.setScene(null);
    const back = this.render;
    const b = BRIDGES[this.s.bridge || 'zh'];
    const close = () => { this.render = back; back?.(); };
    const speak = (text) => {
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'zh-TW'; u.rate = 0.85;
        const v = speechSynthesis.getVoices().find((x) => /zh[-_]TW/i.test(x.lang)) || speechSynthesis.getVoices().find((x) => /^zh/i.test(x.lang));
        if (v) u.voice = v;
        speechSynthesis.cancel(); speechSynthesis.speak(u);
      } catch { /* speech not available */ }
    };
    this.render = () => {
      let title, body;
      if (kind === 'scholarship') {
        title = t(UI.scholarship);
        body = [el('div', { class: 'mini-bridges' }, el('span', { class: 'mini-bridge on', style: { color: b.color } }, el('i', { style: { background: b.color } }), el('span', { style: { color: '#23215F' } }, t(b.name)))), el('p', { style: { marginTop: '12px' } }, t(b.scholarship)), el('p', { class: 'note' }, I18N.lang === 'zh' ? '外國學生若已領台灣政府獎學金，原則上不能再領學校的外國學生獎助學金。' : 'International students already holding a Taiwan government scholarship generally can’t also receive ISU’s international student scholarship.'), link(t(UI.more), 'https://international.isu.edu.tw/scholarships/')];
      } else if (kind === 'dorm') {
        title = t(UI.dorm);
        body = [el('div', { class: 'programs' }, DORM.rooms.map((r) => el('div', { class: 'program' }, el('span', { class: 'pn' }, t(r.name)), el('span', { class: 'pf' }, t(r.price))))), el('ul', { class: 'timeline' }, DORM.notes.map((n) => el('li', {}, t(n)))), link(t(UI.more), DORM.url)];
      } else {
        title = t(UI.tower);
        body = [photo(META.towerPhoto, t(UI.tower)), el('p', {}, t(b.chinese)), el('div', { class: 'programs' }, MANDARIN_TOWER.map((m) => el('button', { class: 'program', type: 'button', onclick: () => speak(m.phrase) },
          el('span', { class: 'pn' }, `${m.level}　${m.phrase}`), icon('speaker'), el('span', { class: 'pf' }, `${m.pinyin} · ${t(m.meaning)}`)))), link(t(UI.more), UI.languageCenterUrl)];
      }
      this.ui.panel({ key: 'support-' + kind, eyebrow: t(UI.support), title, body, foot: [el('span', { class: 'spacer' }), button(t(UI.close), close, { kind: 'quiet small', iconName: 'close' })] });
    };
    this.render();
  }

  // ---------- chapter 3: islands ----------
  async islandsStep() {
    if(!this.s.bridge)return this.interestStep();
    this.enter('islands', () => this.islandsStep());
    this.focusedIsland=null;this.showMapTools();
    const app = this.app;
    const token = this.exploreToken = (this.exploreToken || 0) + 1;
    this.setProgress(3); this.narrator.setScene('islands');
    const go = id => id === 'ifp-stop' ? this.pathwayStep('ifp', () => this.islandsStep(), true) : this.focusIsland(id);
    app.handlers = { island: go, program: (id, pid) => this.focusIsland(id, pid) };
    this.islandLabels(go, { dimUnreached: true });
    app.labels.hotspot('ifp-stop', app.arch.foundation.anchorObj, I18N.lang === 'zh' ? '華語先修島 · IFP' : 'Mandarin foundation · IFP', () => go('ifp-stop'), { className: 'island foundation', noStem: true });
    for (const isl of app.arch.islands) app.arch.setPrograms(isl, p => programStatus(p, this.s).ready);
    const home = this.islandsView();
    const flight = app.flyExplore(home.pos, home.look, 2.0);
    this.view(() => {
      this.narrator.setScene('islands');
      this.ui.panel({ key: 'islands', tall: true, eyebrow: t(UI.chapters[3]), title: t(UI.islandsTitle), body: [
        el('p', { class: 'note' }, t(UI.islandsHint)),
        el('p', { class: 'route-current' }, t(BRIDGES[this.s.bridge].name), ' · ', this.s.answers.lang === 'en' ? t(UI.langEn) : this.s.bridge === 'ifp' ? (I18N.lang === 'zh' ? '先學華語，再讀中文科系' : 'Mandarin first, then Chinese-taught study') : this.s.answers.lang === 'zh' ? t(UI.langZh) : (I18N.lang === 'zh' ? '語言待準備' : 'Language preparation needed')),
        this.connectionControls(()=>this.render()),this.pathwayCards(),
        el('div', { class: 'options grid2' }, ISLANDS.map(isl => {
          const n = isl.programs.filter(p => programStatus(p, this.s).ready).length;
          return el('button', { class: 'option' + (this.s.visited.has(isl.id) ? ' on' : ''), type: 'button', onclick: () => go(isl.id) }, el('span', { class: 'dot', style: { background: isl.color } }, t(isl.name).slice(0, 1)), el('span', {}, el('div', { class: 't' }, t(isl.name)), el('div', { class: 's' }, `${n} / ${isl.programs.length} ` + (I18N.lang === 'zh' ? '盞燈亮起' : 'programs lit'))));
        })),
        el('p', { class: 'note catalog-scope' }, I18N.lang === 'zh' ? '收錄 2026–2027 外國學生簡章所列系所與 2027 春季 INTENSE 兩個專班，共 38 個探索入口。點燈為初步篩選，正式資格與開班依當期簡章。' : '38 entries cover departments in the 2026–27 international prospectus and both spring 2027 INTENSE programs. Lights are an initial screen; the current prospectus determines eligibility and availability.'),
        link(I18N.lang === 'zh' ? '全校學術單位' : 'All university academic units', 'https://www.isu.edu.tw/academics'),
      ], foot: [this.backButton(), el('span', { class: 'spacer' }), button(I18N.lang === 'zh' ? '調整入學路徑' : 'Change admission route', () => this.bridgeStep(), { kind: 'quiet small' })].filter(Boolean) });
    });
    await flight;
  }

  async focusIsland(id, initialProgram = null) {
    const app = this.app, isl = app.arch.byId(id);
    if (!isl) return;
    const token = this.exploreToken = (this.exploreToken || 0) + 1;
    const preview=!this.s.bridge;
    if(preview)app.arch.setLit(isl,true,.5);
    const canLand=!preview&&isl.def.programs.some(p=>programStatus(p,this.s).ready);
    this.s.interest=id;this.s.pendingIsland=id;
    this.setProgress(preview?1:3);this.narrator.setScene('island-'+id);app.orbit(false);
    this.s.programSelections ||= {};
    let selected = initialProgram===false?null:initialProgram || this.s.programSelections[id] || null;
    if(selected)this.s.programSelections[id]=selected;
    if(selected)this.enter('island:'+id+':'+selected, () => this.focusIsland(id, selected));
    else this.enter('island:'+id, () => this.focusIsland(id, false));
    let tab='intro',filter=this.s.mapFilter||'all';
    this.focusedIsland={id,programId:selected};this.showMapTools();this.app.arch.clearConnections();
    const f = this.frameIsland(isl, 1.65, 0.9);
    const tr = !canLand?this.travelerToCampus():this.placeTraveler(isl.group, this.landing(isl), 1.65);
    tr.setStage('student');if(canLand)tr.face(f.pos);
    this.s.visited.add(id);
    this.showViews({ center: f.look, radius: isl.radius * 1.8, home: { pos: f.pos, look: f.look }, onBird: () => this.birdsEye() });
    const flight = app.flyExplore(f.pos, f.look, 1.8);
    if(filter!=='all')this.mapConnections(filter,id);
    const chooseBridge=()=>{this.s.pendingIsland=id;this.s.pendingProgram=selected;this.bridgeStep();};
    const choose = pid => {
      selected = pid;tab='intro';this.focusedIsland={id,programId:pid};this.s.programSelections[id]=pid;
      this.enter('island:'+id+':'+pid, () => this.focusIsland(id, pid));
      sound.select(); tr.setStage('student'); tr.wave(1); this.render();
    };
    app.handlers = { island: other => other === 'ifp-stop' ? this.pathwayStep('ifp', () => this.islandsStep(), true) : other !== id && this.focusIsland(other), program: (other, pid) => other === id ? choose(pid) : this.focusIsland(other, pid) };
    const programLabels = () => this.labels(() => {
      isl.def.programs.forEach((p, index) => {
        const status = programStatus(p, this.s);
        const visible = filter === 'all' || (filter === 'ready' ? status.ready : matchesConnectionFilter(p,filter));
        if (!visible) return;
        const short = I18N.lang === 'zh' ? p.name.zh.replace('學士學位學程', '學程').replace('英語', '').replace('學系', '') : p.name.en.replace(/^(Dept\. of |Program in |International Program on )/, '');
        app.labels.hotspot('p-' + p.id, isl.programAnchors[p.id], `${String(index + 1).padStart(2, '0')} · ${short}`, () => choose(p.id), { compactText: `${String(index + 1).padStart(2, '0')} · ${p.lang === 'en' ? 'EN' : '中'}`, className: 'program-pin' + (preview?' preview':status.ready ? ' lit' : '') + (selected === p.id ? ' selected' : ''), small: status.ready ? (I18N.lang === 'zh' ? '● 初步相符' : '● Initial match') : p.lang === 'en' ? 'EN' : '中文', aria: t(p.name) + (status.ready ? (I18N.lang === 'zh' ? '，初步相符，開啟科系' : ', initial match, open program') : (I18N.lang === 'zh' ? '，開啟科系介紹' : ', open program introduction')) });
      });
    });
    this.view(() => {
      const d = isl.def;
      const sel = d.programs.find(p => p.id === selected);
      const status = sel ? programStatus(sel, this.s) : null;
      app.arch.setPrograms(isl,p=>(filter!=='all'&&!(filter==='ready'?programStatus(p,this.s).ready:matchesConnectionFilter(p,filter)))?false:preview?null:programStatus(p,this.s).ready,selected);
      const filters = [['all', I18N.lang === 'zh' ? '全部' : 'All'], ['en', I18N.lang === 'zh' ? '英文授課' : 'English'], ['zh', I18N.lang === 'zh' ? '中文授課' : 'Chinese'],['ifp',I18N.lang==='zh'?'IFP 銜接':'IFP links'],['intense','INTENSE'], ...(preview?[]:[['ready', I18N.lang === 'zh' ? '亮燈科系' : 'Lit programs']])];
      const filterBar = el('div', { class: 'chips program-filters', role: 'group', 'aria-label': I18N.lang === 'zh' ? '科系篩選' : 'Program filter' }, filters.map(([value, label]) => el('button', { class: 'chip' + (filter === value ? ' on' : ''), type: 'button', 'aria-pressed': String(filter === value), 'data-map-filter':value, onclick: () => {filter=value;this.mapConnections(value,id);this.render();} }, label)));
      const visible = d.programs.filter(p => filter === 'all' || (filter === 'ready' ? programStatus(p, this.s).ready : matchesConnectionFilter(p,filter)));
      const cards = el('div', { class: 'programs program-directory' }, visible.map((p) => {
        const lit = programStatus(p, this.s).ready;
        return el('button', { class: 'program program-choice' + (preview?' preview':lit ? ' lit' : ' muted') + (selected === p.id ? ' on' : ''), type: 'button', 'data-program-id': p.id, 'aria-pressed': String(selected === p.id), onclick: () => choose(p.id) },
          el('span', { class: 'program-lamp' + (lit ? ' on' : ''), 'aria-hidden': 'true' }), el('span', { class: 'pn' }, t(p.name)), el('span', { class: 'pf' }, t(p.focus)),
          el('span', { class: 'meta' }, el('span', { class: 'tag' }, p.lang === 'en' ? t(UI.langEn) : p.id === 'aj' ? (I18N.lang === 'zh' ? '中文／日文' : 'Chinese / Japanese') : t(UI.langZh)), el('span', { class: 'tag' }, t(levelLabel(p))), el('span', { class: 'tag' + (lit ? ' gold' : '') }, preview?(I18N.lang==='zh'?'先了解科系':'Preview program'):lit ? (I18N.lang === 'zh' ? '初步相符' : 'Initial match') : (I18N.lang === 'zh' ? '可探索 · 另有條件' : 'Explore · Conditions apply'))));
      }));
      const special=visible.filter(p=>p.level==='intense');
      if(special.length) {
        const box=el('section',{class:'other-options program-other-options','aria-label':'Other Options'},el('h3',{},'Other Options'),el('p',{class:'note'},I18N.lang==='zh'?'企業合作專班 · INTENSE':'Industry partnership programs · INTENSE'));
        for(const p of special) box.append(cards.querySelector(`[data-program-id="${p.id}"]`));
        cards.append(box);
      }
      const list = [el('p', { class: 'note' }, preview?(I18N.lang==='zh'?'先看看這座島在學什麼。尚未選橋，所有科系都能預覽。':'Explore the programs before choosing an admission bridge.'):t(UI.islandsHint)), filterBar, el('p', { class: 'directory-count' }, `${visible.length} / ${d.programs.length} ` + (I18N.lang === 'zh' ? '個科系／學程' : 'programs')), visible.length ? cards : el('p', { class: 'empty-state' }, I18N.lang === 'zh' ? '這座島目前沒有符合此篩選的科系。切換「全部」仍可探索每個系所。' : 'No programs match this filter on this island. Choose All to explore every program.')];
      let body, foot;
      if (!sel) {
        body = [this.islandCrumbs(d, preview, null),el('p',{class:'phase-ribbon'},icon('cloudlet'),preview?(I18N.lang==='zh'?'1 · 島嶼預覽，還沒跨橋':'1 · Island preview, before crossing'):(canLand?(I18N.lang==='zh'?'3 · 橋已連接，選擇課程':'3 · Your bridge is connected'):(I18N.lang==='zh'?'這座橋未直達，先比較科系':'This bridge does not reach this island yet'))),el('p',{class:'lead'},t(ISLAND_INTROS[id])),...list];
        foot = [this.backButton(),el('span',{class:'spacer'}),...(preview?[button(I18N.lang==='zh'?'認識起點，找入學橋':'Find my admission bridge',chooseBridge,{iconName:'arrow'})]:[])].filter(Boolean);
      } else {
        const profile = PROGRAM_PROFILES[sel.id];
        const tabs = [['intro', I18N.lang === 'zh' ? '認識科系' : 'About'], ['day', t(UI.stationDay)], ['years', t(yearsLabel(sel))], ['future', t(UI.stationFuture)]];
        const selectTab = value => { tab = value; if (preview) {this.render();return;} if (value === 'years') { tr.setStage('graduate'); tr.cheer(1); } else if (value === 'future') tr.setStage('pro', id); else tr.setStage('student'); this.render(); };
        let content;
        if (tab === 'intro') content = [el('p', { class: 'lead' }, t(profile.intro)), el('h3', {}, I18N.lang === 'zh' ? '這樣的你，可能會喜歡' : 'You might enjoy this if…'), el('p', {}, t(profile.fit)), el('h3', {}, I18N.lang === 'zh' ? '你會探索的能力' : 'Skills to explore'), el('ul', { class: 'skill-list' }, profile.skills.map(s => el('li', {}, t(s))))];
        if (tab === 'day') content = [el('p', { class: 'note' }, I18N.lang === 'zh' ? '想像你在這個科系的一天' : 'Imagine a day in this program'), el('div', { class: 'day' }, profile.day.map((m, i) => el('div', { class: 'moment', style: { animationDelay: i * 0.1 + 's' } }, el('span', { class: 'clock' }, ['09:00','14:00','19:00'][i]), el('span', {}, t(m)))))];
        if (tab === 'years') content = [el('p', { class: 'note' }, (this.s.bridge?t(BRIDGES[this.s.bridge].tag):(I18N.lang==='zh'?'科系學習情境預覽':'Program study preview')) + ' · ' + t(levelLabel(sel))), el('ul', { class: 'timeline' }, programJourney(sel, this.s.bridge).map((m, i) => el('li', { style: { animationDelay: i * 0.08 + 's' } }, el('b', {}, t(m.title)), el('div', {}, t(m.body)))))];
        if (tab === 'future') content = [el('p', { class: 'lead' }, t(profile.future)), el('p', {}, t(LIFE_CARDS.find(l => l.id === this.s.life)?.scene)), el('p', { class: 'note' }, I18N.lang === 'zh' ? '這是可能的發展方向，可以隨學習與作品慢慢調整。' : 'These are possible directions that can change as you learn and build your work.')];
        const conditions = [];
        if (!status.route) conditions.push(I18N.lang === 'zh' ? '需改走：' + sel.bridges.map(k => t(BRIDGES[k].tag)).join('、') : 'Requires: ' + sel.bridges.map(k => t(BRIDGES[k].tag)).join(', '));
        if (!status.language) conditions.push(I18N.lang === 'zh' ? '此系需要' + (sel.lang === 'en' ? '英文' : '中文') + '授課能力' : 'Teaching language: ' + (sel.lang === 'en' ? 'English' : 'Chinese'));
        if (!status.education) conditions.push(I18N.lang === 'zh' ? '需具備對應的前一階段學歷，詳見簡章' : 'Previous-degree requirements apply; see the prospectus');
        if (!status.eligible) conditions.push(I18N.lang === 'zh' ? '目前背景未符合所選管道的初篩' : 'Your background does not match the selected route screen');
        body = [
          this.islandCrumbs(d, preview, sel),
          el('div', { class: 'program-heading', style: { '--island-color': d.color } }, el('div', { class: 'meta' }, el('span', { class: 'tag' }, t(levelLabel(sel))), el('span', { class: 'tag' }, sel.lang === 'en' ? t(UI.langEn) : sel.id === 'aj' ? (I18N.lang === 'zh' ? '中文／日文' : 'Chinese / Japanese') : t(UI.langZh)), el('span', { class: 'tag' }, sel.campus === 'medical' ? t(UI.medicalCampus) : t(UI.mainCampus)))),
          link(t(UI.visitSite), sel.url, { kind: 'indigo small' }),
          el('div', { class: 'program-tabs', role: 'tablist', 'aria-label': I18N.lang === 'zh' ? '科系內容' : 'Program details' }, tabs.map(([value,label]) => el('button', { id: 'tab-' + value, type: 'button', class: tab === value ? 'on' : '', role: 'tab', 'aria-selected': String(tab === value), 'aria-controls': 'program-detail', tabindex: tab === value ? '0' : '-1', onclick: () => selectTab(value), onkeydown: e => { if (!['ArrowRight','ArrowLeft','Home','End'].includes(e.key)) return; e.preventDefault(); const current = tabs.findIndex(x => x[0] === tab); const next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (current + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length; selectTab(tabs[next][0]); this.ui.panelEl.querySelector('#tab-' + tabs[next][0]).focus(); } }, label))),
          el('div', { id: 'program-detail', class: 'program-detail', role: 'tabpanel', 'aria-labelledby': 'tab-' + tab }, ...content),
          preview?el('div',{class:'admission-status preview'},el('b',{},I18N.lang==='zh'?'先認識科系，再找到通往它的橋。':'Get to know the program, then find the bridge that reaches it.'),el('p',{},I18N.lang==='zh'?'還沒選橋，暫時不判斷能否申請。下一步會依學歷、授課語言與背景確認路徑。':'No admission route has been chosen yet. Next, use your education, teaching language and background to explore the options.')):el('div', { class: 'admission-status' + (status.ready ? ' ready' : '') }, el('b', {}, status.ready ? (I18N.lang === 'zh' ? '● 與目前路徑、語言及學歷初步相符' : '● Initial route, language and education match') : (I18N.lang === 'zh' ? '○ 可以探索，申請條件需要調整' : '○ Explore this program; admission conditions need attention')), ...conditions.map(c => el('p', {}, c))),
          button(preview?(I18N.lang==='zh'?'用我的背景找入學橋':'Find a bridge from my background'):(I18N.lang === 'zh' ? '調整語言與入學路徑' : 'Change language and admission route'), chooseBridge, { kind: 'quiet small' }),
          el('p', { class: 'note' }, t(UI.perSemester) + '：' + (sel.fee ? 'NT$' + sel.fee.toLocaleString() : (I18N.lang === 'zh' ? '依當期公告與獎助核定' : 'See current fees and scholarship award'))),
          !preview&&status.ready?el('p',{class:'anchor-hint'},I18N.lang==='zh'?'喜歡這個方向，就按「確認科系，定錨」，讓小雲替你點亮這個選擇。':'If this feels like your direction, anchor the program and let Cloudlet light up your choice.'):null,
          this.journeySummary(d,sel,true),
          el('p', { class: 'note scenario-note' }, I18N.lang === 'zh' ? '一天與學習歷程為科系特色延伸的探索情境，非正式課表。實習、修課順序、修業年限與畢業條件請看系所公告；研究所依研究進度安排。' : 'Day and study journeys are exploratory scenarios, not official timetables. Courses, placements, duration and graduation requirements follow department announcements; graduate progress varies.'),
          el('details', { class: 'other-programs' }, el('summary', {}, I18N.lang === 'zh' ? '比較這座島的其他科系' : 'Compare other programs on this island'), ...list),
        ];
        foot = [this.backButton(), el('span',{class:'spacer'}), preview?button(I18N.lang==='zh'?'認識起點，找入學橋':'Find my admission bridge',chooseBridge,{iconName:'arrow'}):button(t(UI.plantFlag), () => { this.s.flag = { islandId: id, programId: sel.id }; sound.flag(); this.routeStep(); }, { iconName: 'flag', disabled: !status.ready })];
      }
      this.ui.panel({ key: 'island-' + id + '-' + (selected || 'directory'), tall: true, eyebrow: (preview?(I18N.lang==='zh'?'島嶼預覽':'Island preview'):t(d.name)) + ' · ' + t(d.industry), title: sel ? t(sel.name) : t(d.name), body, foot });
      programLabels();
    });
    await flight;
  }

  islandCrumbs(d, preview, sel) {
    const zh = I18N.lang === 'zh';
    return this.crumbs([
      { label: preview ? (zh ? '學習島' : 'Fields of study') : (zh ? '群島' : 'Islands'), fn: () => (preview ? this.interestStep() : this.islandsStep()) },
      { label: t(d.name), fn: sel ? () => this.focusIsland(d.id, false) : null },
      sel ? { label: t(sel.name) } : null,
    ].filter(Boolean));
  }

  // camera close-up on the traveler, from the island's outer side
  closeUp(isl) {
    const app = this.app;
    const p = app.traveler.group.getWorldPosition(V(0, 0, 0)).add(V(0, 1.4, 0));
    const out = isl.home.clone().setY(0).normalize();
    const side = V(-out.z, 0, out.x);
    const dir = out.multiplyScalar(0.8).add(side.multiplyScalar(0.5)).setY(0.42);
    app.orbit(false);
    return app.fly(app.frameView(p, 4.8, dir), p, 1.5).then(() => app.orbit(true, { target: p, min: 5, max: 60, minPolar: 0.025, maxPolar: 1.35 }));
  }

  landing(isl) {
    const x = isl.radius * 0.5, z = 0.4;
    return V(x, isl.sy(x, z) - 0.1, z);
  }

  // ---------- chapter 4: route card ----------
  async routeStep() {
    this.hideMapTools();this.app.arch.clearConnections();
    this.enter('route', () => this.routeStep());
    this.exploreToken=(this.exploreToken||0)+1;
    this.narrator.setScene('anchor');
    const app = this.app;
    this.setProgress(4);
    app.orbit(false);
    app.handlers = {};
    app.labels.clear();
    const isl = app.arch.byId(this.s.flag.islandId);
    app.arch.anchorChoice(isl,this.s.flag.programId);
    const tr = app.traveler;
    if (tr.group.parent !== isl.group) this.placeTraveler(isl.group, this.landing(isl), 1.5);
    tr.setStage('pro', isl.def.id);
    tr.cheer(2.2);
    app.skyEnv.setMood('dusk', 3);
    const f = this.frameIsland(isl, 1.9, 0.58);
    tr.face(f.pos);
    this.showViews({ center: f.look, radius: isl.radius * 2, home: { pos: f.pos, look: f.look }, onBird: () => this.birdsEye() });
    app.flyExplore(f.pos,f.look,1.5);
    const canvas = document.createElement('canvas');
    const preview = el('img', { class: 'route-preview', alt: t(UI.routeTitle) });
    const redraw = async () => { await drawRouteCard(canvas, this.s); preview.src = canvas.toDataURL('image/jpeg', 0.85); };
    let timer;
    const b = BRIDGES[this.s.bridge];
    const isl2 = ISLANDS.find((i) => i.id === this.s.flag.islandId);
    const prog = isl2.programs.find((p) => p.id === this.s.flag.programId);
    const mail = () => {
      const lines = [t(UI.askBody), '', `${t(UI.routeFrom)}: ${this.s.homeLabel || '-'}`, `${t(UI.future)}: ${t(PROGRAM_PROFILES[prog.id].future)}`, `${t(UI.program)}: ${studyPath(prog, this.s.bridge).map(step => t(step.name)).join(' → ')}`, `${t(UI.yourBridge)}: ${t(b.name)} (${t(b.tag)})`];
      return `mailto:${META.contactEmail}?subject=${encodeURIComponent(t(UI.askSubject))}&body=${encodeURIComponent(lines.join('\n'))}`;
    };
    this.view(() => {
      const input = el('input', { id: 'route-name', type: 'text', maxlength: 28, value: this.s.name, autocomplete: 'off', placeholder: I18N.lang === 'zh' ? '例如：Linh' : 'e.g. Linh' });
      input.addEventListener('input', () => { this.s.name = input.value; clearTimeout(timer); timer = setTimeout(redraw, 250); });
      this.ui.panel({
        tall: true, eyebrow: t(UI.chapters[4]), title: t(UI.routeTitle),
        body: [el('div', { class: 'route-wrap' },
          this.journeySummary(isl2,prog),
          preview,
          el('div', { class: 'field' }, el('label', { for: 'route-name' }, t(UI.yourName)), input),
          el('div', { class: 'actions' },
            button(t(UI.share), async () => { const r = await exportRouteCard(canvas, 'isu-route-card.png'); if (r === 'downloaded') this.ui.toast(t(UI.download)); }, { iconName: 'share' }),
            link(t(UI.apply), b.applyUrl, { kind: 'indigo', iconName: 'arrow' }),
            link(t(UI.ask), mail(), { kind: 'quiet', iconName: 'chat' }),
            link(t(UI.learnMore), b.infoUrl, { kind: 'quiet' }),
            button(t(UI.replay), () => this.replay(), { kind: 'quiet full', iconName: 'replay' })),
          el('p', { class: 'note' }, t(b.deadline)),
        )],
        foot: [this.backButton()].filter(Boolean),
      });
      redraw();
    });
  }

  replay() {
    const app = this.app;
    this.s.interest=null;this.s.life=null;this.s.flag=null;this.s.stations={};this.s.bridge=null;this.s.primary=null;this.s.answers={};this.s.pendingIsland=null;this.s.pendingProgram=null;this.s.programSelections={};this.s.routeIntent=null;this.s.mapFilter='all';app.arch.clearBridges();app.arch.clearAnchor?.();
    app.arch.setBeacon(null, false);
    app.skyEnv.setMood('golden', 2);
    this.travelerToCampus().setStage('student');
    this.nav = this.nav.filter((n) => ['globe', 'taiwan', 'kaohsiung', 'campus'].includes(n.key));
    this.lifeStep();
    app.fly(this.app.frameView(WORLD.islands.clone().add(V(0, -6, 0)), 62, V(0, 0.95, 1)), WORLD.islands.clone().add(V(0, -6, 0)), 2.4);
  }
}
