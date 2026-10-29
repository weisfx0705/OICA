import * as THREE from 'three';
import { I18N, t, el, storage, wait, haversineKm } from './util.js';
import { UI, COUNTRIES, TAIWAN, KAOHSIUNG_STAGE, CAMPUS, LIFE_CARDS, QUESTIONS, ISLANDS, BRIDGES, DORM, MANDARIN_TOWER, META } from './content.js';
import { resolveBridge, programReachable, programStatus, routeEligible, programJourney, yearsLabel, levelLabel } from './logic.js';
import { photo, button, link, icon, gallery } from './ui.js';
import { SKINS, OUTFITS } from './world/traveler.js';
import { drawRouteCard, exportRouteCard } from './routecard.js';
import { WORLD } from './world/layout.js';
import { sound } from './audio.js';
import { PROGRAM_PROFILES } from './program-profiles.js';
import { Narrator } from './narrator.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export class Flow {
  constructor(app) {
    this.app = app;
    this.ui = app.ui;
    this.narrator = new Narrator(this.ui.root, () => this.toggleLang());
    this.s = { country: null, home: null, homeLabel: '', career: null, life: null, answers: {}, bridge: null, alts: [], needLanguage: false, visited: new Set(), stations: {}, flag: null, name: '', look: { skin: SKINS[1], outfit: OUTFITS[0] } };
    this.render = null;
    this.relabel = null;
    this.progress = -1;
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
    this.narrator.setScene(skip ? 'career' : 'globe');
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
      const chips = COUNTRIES.map((c) => el('button', { class: 'chip' + (this.s.country === c.code ? ' on' : ''), type: 'button', onclick: () => choose(c) }, t(c.name)));
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
    const app = this.app, T = WORLD.taiwan;
    this.exploreToken = (this.exploreToken || 0) + 1; app.orbit(false);
    app.fly(app.frameView(V(0, 0, 1), 20, V(0.22, 0.85, 0.55)), V(0, 0, 1), 4.5);
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
        ? [...this.chapterBody(detail), el('div', { class: 'chips' }, TAIWAN.keywords.map((k) => el('button', { class: 'chip' + (k === detail ? ' on' : ''), onclick: () => { detail = k; seen.add(k.id); this.render(); } }, t(k.title))))]
        : [el('div', { class: 'chips' }, TAIWAN.keywords.map(k => el('button', { class: 'chip', type: 'button', onclick: () => { detail=k; seen.add(k.id); this.render(); } }, t(k.title)))), gallery(TAIWAN.gallery), el('p', { class: 'lead' }, t(TAIWAN.line)), this.transitLegend('taiwan'), el('ul', { class: 'timeline' }, TAIWAN.facts.map((f, i) => el('li', { style: { animationDelay: i * 0.08 + 's' } }, t(f)))), el('p', { class: 'note' }, t(UI.tapToExplore))];
      this.ui.panel({
        key: 'taiwan-' + (detail?.id || 'overview'), compact: !detail, tall: !!detail, eyebrow: t(UI.chapters[0]), title: detail ? t(detail.title) : t(TAIWAN.title), body,
        foot: [detail ? button(t(UI.back), () => { detail = null; this.render(); }, { kind: 'quiet small' }) : null, el('span', { class: 'spacer' }), button(t(UI.khh), () => this.leaveTaiwan(), { iconName: 'arrow' })].filter(Boolean),
      });
    });
  }

  async leaveTaiwan() {
    if (this.busy) return; this.busy = true;
    const app = this.app;
    this.ui.closePanel(); app.labels.clear(); this.render = null;
    const k = app.tw.anchors.kaohsiung.clone().add(WORLD.taiwan);
    await app.fly(k.clone().add(V(4, 8, 10)), k.clone().add(V(0, -5, 0)), 2);
    await app.wipe(() => { app.setStage('kaohsiung'); app.place(app.frameView(WORLD.kaohsiung, 36, V(-0.1, 0.7, 1)), WORLD.kaohsiung.clone().add(V(0, 2, 0))); });
    this.busy = false;
    this.kaohsiungStep();
  }

  // ---------- prelude: Kaohsiung ----------
  kaohsiungStep() {
    const app = this.app, K = WORLD.kaohsiung;
    this.exploreToken = (this.exploreToken || 0) + 1; app.orbit(false);
    this.khhView = () => app.frameView(K, 34, V(-0.45, 0.62, 0.75));
    app.fly(this.khhView(), K.clone().add(V(0, 1, 0)), 5);
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
        ? [...this.chapterBody(detail), this.transitLegend('kaohsiung'), el('div', { class: 'chips' }, KAOHSIUNG_STAGE.spots.map((s) => el('button', { class: 'chip' + (s === detail ? ' on' : ''), onclick: () => { detail = s; seen.add(s.id); this.render(); this.peek(K, app.khh.anchors[s.id]); } }, t(s.title))))]
        : [gallery(KAOHSIUNG_STAGE.gallery), el('p', { class: 'lead' }, t(KAOHSIUNG_STAGE.line)), this.transitLegend('kaohsiung'), el('div', { class: 'chips' }, KAOHSIUNG_STAGE.spots.map((s) => el('button', { class: 'chip', onclick: () => { detail = s; seen.add(s.id); this.render(); this.peek(K, app.khh.anchors[s.id]); } }, t(s.title))))];
      this.ui.panel({
        key: 'khh-' + (detail?.id || 'overview'), compact: !detail, tall: !!detail, eyebrow: t(UI.chapters[0]), title: detail ? t(detail.title) : t(KAOHSIUNG_STAGE.title), body,
        foot: [detail ? button(t(UI.back), () => { detail = null; this.render(); app.fly(this.khhView(), K.clone().add(V(0, 1, 0)), 1.8); }, { kind: 'quiet small' }) : null, el('span', { class: 'spacer' }), button(t(UI.guanyin), () => this.leaveKaohsiung(), { iconName: 'arrow' })].filter(Boolean),
      });
    });
  }

  peek(origin, anchor) {
    const p = anchor.clone().add(origin);
    this.app.traveler.face(p);
    this.app.traveler.wave(1.2);
    const dir = p.clone().sub(origin).setY(0).normalize();
    if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);
    this.app.fly(p.clone().addScaledVector(dir, 22).add(V(0, 12, 0)).add(V(dir.z * 8, 0, -dir.x * 8)), p.clone().add(V(0, -3, 0)), 1.8);
  }

  async leaveKaohsiung() {
    if (this.busy) return; this.busy = true;
    const app = this.app;
    this.ui.closePanel(); app.labels.clear(); this.render = null;
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
    const app = this.app, C = WORLD.campus;
    this.exploreToken = (this.exploreToken || 0) + 1; app.orbit(false);
    this.campusView = () => app.frameView(C.clone().add(V(13, 0, 6)), 40, V(0.35, 0.5, 0.85));
    app.fly(this.campusView(), C.clone().add(V(13, 0, 6)), 4.5);
    const showSpot = s => { if(s.id === 'main') {const look=C.clone().add(V(-2,2,0));app.fly(app.frameView(look,28,V(0.3,0.75,1)),look,1.8);} else this.peek(C,anchors[s.id]); };
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
      const chips = el('div', { class: 'chips' }, CAMPUS.spots.map((s) => el('button', { class: 'chip' + (s === detail ? ' on' : ''), onclick: () => { detail = s; seen.add(s.id); this.render(); showSpot(s); } }, t(s.title))));
      const body = detail ? [...this.chapterBody(detail), chips] : [chips, gallery(CAMPUS.gallery), el('p', { class: 'lead' }, t(CAMPUS.line)), el('p', { class: 'note' }, I18N.lang === 'zh' ? '3D 為空間關係示意。點開校本部可看官方平面圖與建築說明。' : 'The 3D view is schematic. Open Main campus for the official plan and building guide.')];
      this.relabel?.();
      this.ui.panel({
        key: 'campus-' + (detail?.id || 'overview'), compact: !detail, tall: !!detail, eyebrow: t(UI.chapters[0]), title: detail ? t(detail.title) : t(CAMPUS.title), body,
        foot: [detail ? button(t(UI.back), () => { detail = null; this.render(); app.fly(this.campusView(), C.clone().add(V(13, 0, 6)), 1.8); }, { kind: 'quiet small' }) : null, el('span', { class: 'spacer' }), button(t(UI.continue), () => this.revealIslands(), { iconName: 'arrow' })].filter(Boolean),
      });
    });
  }

  async revealIslands() {
    if (this.busy) return; this.busy = true;
    const app = this.app;
    this.narrator.stop();
    this.ui.closePanel(); app.labels.clear(); this.render = null;
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
    this.careerStep();
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
  islandLabels(onClick, { dimUnreached = false } = {}) {
    const app = this.app;
    this.labels(() => {
      for (const isl of app.arch.islands) {
        const reached = !this.s.bridge || isl.def.programs.some((p) => dimUnreached ? programStatus(p, this.s).ready : programReachable(p, this.s.bridge));
        const cls = 'island' + (isl.def.id === this.s.career ? ' target' : '') + (dimUnreached && !reached ? ' dim' : '') + (this.s.visited.has(isl.def.id) ? ' seen' : '');
        app.labels.hotspot('i-' + isl.def.id, isl.anchorObj, t(isl.def.name), onClick ? () => onClick(isl.def.id) : null, { className: cls, small: isl.def.id === this.s.career ? t(UI.firstStop) : null, noStem: true });
      }
    });
  }

  careerStep() {
    this.narrator.setScene('career');
    const app = this.app;
    this.setProgress(1);
    const pick = (id) => {
      if (id === 'ifp-stop') { this.pathwayStep('ifp', () => this.careerStep()); return; }
      sound.select();
      this.s.career = id;
      const isl = app.arch.byId(id);
      app.arch.setBeacon(isl, true);
      app.traveler.face(this.islandWorld(isl));
      app.traveler.wave(1.5);
      const f = this.frameIsland(isl, 2.2, 0.45);
      app.fly(f.pos, f.look, 2.2);
      this.islandLabels(pick);
      this.render();
    };
    app.handlers = { island: pick };
    this.islandLabels(pick);
    this.view(() => {
      this.ui.panel({
        eyebrow: t(UI.chapters[1]), title: t(UI.careerPick),
        body: [el('p', { class: 'lead' }, t(UI.futureTitle)), el('div', { class: 'options' }, ISLANDS.map((isl) => el('button', { class: 'option' + (this.s.career === isl.id ? ' on' : ''), type: 'button', onclick: () => pick(isl.id) },
          el('span', { class: 'dot', style: { background: isl.color } }, t(isl.name).slice(0, 1)),
          el('span', {}, el('div', { class: 't' }, t(isl.career)), el('div', { class: 's' }, `${t(isl.name)} · ${t(isl.industry)}`)),
          el('span', { class: 'chev' }, '›'))))],
        foot: [el('span', { class: 'spacer' }), button(t(UI.continue), () => this.lifeStep(), { iconName: 'arrow', disabled: !this.s.career })],
      });
    });
  }

  lifeStep() {
    this.narrator.setScene('life');
    this.app.handlers = {};
    this.view(() => {
      this.ui.panel({
        eyebrow: t(UI.chapters[1]), title: t(UI.lifePick),
        body: [el('div', { class: 'options' }, LIFE_CARDS.map((c, i) => el('button', { class: 'option' + (this.s.life === c.id ? ' on' : ''), type: 'button', onclick: () => { this.s.life = c.id; this.render(); } },
          el('span', { class: 'dot', style: { background: ['#36348E', '#E07A5F', '#3E9E86', '#F29A8E', '#8A93B8'][i] } }, String(i + 1)),
          el('span', {}, el('div', { class: 't' }, t(c.title))),
          el('span', { class: 'chev' }, '›'))))],
        foot: [button(t(UI.back), () => this.careerStep(), { kind: 'quiet small' }), el('span', { class: 'spacer' }), button(t(UI.continue), () => this.bridgeStep(), { iconName: 'arrow', disabled: !this.s.life })],
      });
    });
  }

  // ---------- chapter 2: bridge ----------
  bridgeFrom() { return WORLD.campus.clone().add(V(-3.5, 10, 4)); }

  async bridgeStep() {
    const app = this.app, C = WORLD.campus;
    this.setProgress(2);
    app.labels.clear(); app.handlers = {};
    app.arch.setBeacon(null, false); this.travelerToCampus();
    await app.fly(C.clone().add(V(70, 34, 120)), C.clone().add(V(0, 26, 0)), 2.0);
    let result = !!this.s.bridge;
    const answers = this.s.answers;
    this.view(() => {
      const preview = this.previewBridge || this.s.bridge;
      this.narrator.setScene(result ? 'bridge-' + preview : 'bridges');
      if (!result) {
        const countryPick = el('div', { class: 'qblock' }, el('p', { class: 'qt' }, t(UI.whereFrom)), el('div', { class: 'chips' }, [...COUNTRIES, { code: 'XX', name: { zh: '其他地區', en: 'Another place' } }].map(c => el('button', { class: 'chip' + (this.s.country === c.code ? ' on' : ''), type: 'button', 'aria-pressed': String(this.s.country === c.code), onclick: () => { this.s.country = c.code; if (c.lat != null) this.s.home = { lat: c.lat, lon: c.lon }; this.s.homeLabel = t(c.name); this.s.homeLabelObj = c.name; this.render(); } }, t(c.name)))));
        const blocks = QUESTIONS.map(q => el('div', { class: 'qblock' }, el('p', { class: 'qt' }, t(q.title)), el('div', { class: 'chips' }, q.options.map(o => el('button', { class: 'chip' + (answers[q.id] === o.id ? ' on' : ''), type: 'button', 'aria-pressed': String(answers[q.id] === o.id), onclick: () => { answers[q.id] = o.id; this.render(); } }, t(o.label))))));
        const done = QUESTIONS.every(q => answers[q.id]) && this.s.country;
        this.ui.panel({ key: 'bridge-questions', tall: true, eyebrow: t(UI.chapters[2]), title: t(UI.bridgeTitle),
          body: [this.pathwayCards(), countryPick, ...blocks],
          foot: [button(t(UI.back), () => this.lifeStep(), { kind: 'quiet small' }), button(t(UI.bridgeTitle), () => {
            Object.assign(this.s, resolveBridge(answers, this.s.country)); this.s.bridge = this.s.primary;
            this.previewBridge = this.s.primary; result = true; app.arch.showBridge(this.s.bridge, this.bridgeFrom()); sound.bridge(); this.render();
          }, { iconName: 'arrow', disabled: !done })],
        });
        return;
      }
      const b = BRIDGES[preview];
      const canUse = routeEligible(preview, this.s);
      const notice = !canUse ? (I18N.lang === 'zh' ? '目前回答未符合此路徑的初步身分或學歷條件。可閱讀內容，或重新回答。' : 'Your answers do not match the initial background or education screen for this route. Explore it, or change your answers.') : (I18N.lang === 'zh' ? '這是路徑初篩。正式資格、語言證明與錄取結果，依當期簡章與審查。' : 'This is an initial route screen. Formal eligibility, evidence and admission follow the current prospectus.');
      this.ui.panel({ key: 'bridge-result-' + preview, tall: true, eyebrow: t(UI.chapters[2]), title: t(UI.bridgeTitle), body: [
        el('div', { class: 'bridge-card', style: { background: `linear-gradient(135deg, ${b.color}, ${b.color}cc)` } }, el('p', { class: 'bt' }, preview === this.s.primary ? t(UI.yourBridge) : t(UI.otherBridges)), el('p', { class: 'bn' }, t(b.name)), el('p', { class: 'bt' }, t(b.tag)), el('p', {}, t(b.who)), el('p', {}, t(b.how))),
        el('p', { class: 'note' }, notice), el('p', { class: 'note' }, t(b.chinese)),
        b.rule ? el('p', { class: 'note' }, t(b.rule)) : null,
        this.s.needLanguage ? el('p', { class: 'note' }, t(UI.needLanguage)) : null,
        this.pathwayCards(),
        el('h3', {}, t(UI.otherBridges)), el('div', { class: 'mini-bridges' }, Object.entries(BRIDGES).map(([k, value]) => el('button', { class: 'mini-bridge' + (preview === k ? ' on' : ''), type: 'button', 'aria-pressed': String(preview === k), style: { color: value.color }, onclick: () => { this.previewBridge = k; app.arch.showBridge(k, this.bridgeFrom()); this.render(); } }, el('i', { style: { background: value.color } }), el('span', { style: { color: '#23215F' } }, t(value.name), k === this.s.primary ? ' ★' : '')))),
        link(I18N.lang === 'zh' ? '官方路徑說明' : 'Official route information', b.infoUrl),
      ], foot: [button(I18N.lang === 'zh' ? '重新回答' : 'Change answers', () => { result = false; this.s.bridge = null; this.previewBridge = null; app.arch.clearBridges(); this.render(); }, { kind: 'quiet small' }),
        button(I18N.lang === 'zh' ? '走這條路探索' : 'Explore this route', () => { this.s.bridge = preview; this.previewBridge = null; app.arch.showBridge(preview, this.bridgeFrom()); if (preview === 'ifp' || preview === 'intense') this.pathwayStep(preview, () => this.islandsStep(), true); else this.islandsStep(); }, { iconName: 'arrow', disabled: !canUse })],
      });
    });
    this.showDock();
  }

  pathwayCards() {
    const back = this.render;
    const cards = el('div', { class: 'pathway-cards' }, ...['ifp', 'intense'].map(k => el('button', { class: 'pathway-card', type: 'button', onclick: () => this.pathwayStep(k, back) }, el('span', { class: 'pathway-symbol', 'aria-hidden': 'true' }, k === 'ifp' ? '文' : '⚙'), el('span', {}, el('strong', {}, k === 'ifp' ? (I18N.lang === 'zh' ? '先學中文的華語島' : 'Mandarin foundation island') : (I18N.lang === 'zh' ? '企業合作 · INTENSE' : 'Industry partnership · INTENSE')), el('small', {}, k === 'ifp' ? (I18N.lang === 'zh' ? '1 年先修 → 13 個銜接科系' : '1 foundation year → 13 degree choices') : (I18N.lang === 'zh' ? '在校 → 企業實習 → 依約就業' : 'Campus → Internship → Employment'))))));
    return el('section', { class:'other-options', 'aria-label':'Other Options' },el('h3',{},'Other Options'),el('p',{class:'note'},I18N.lang==='zh'?'先學華語，或走企業合作的入學路徑。':'Explore Mandarin preparation or an industry partnership route.'),cards);
  }

  pathwayStep(kind, back = () => this.islandsStep(), travel = false) {
    const b = BRIDGES[kind];
    if (travel && kind === 'ifp') {
      this.exploreToken = (this.exploreToken || 0) + 1;
      const isl = this.app.arch.foundation, f = this.frameIsland(isl, 1.5, 0.5);
      this.app.orbit(false); this.app.fly(f.pos, f.look, 1.8);
      this.placeTraveler(isl.group, this.landing(isl), 1.5).setStage('student');
      this.labels(() => this.app.labels.hotspot('ifp-stop', isl.anchorObj, I18N.lang === 'zh' ? '先修年 · TOCFL A2' : 'Foundation year · TOCFL A2', null, { className: 'tag-only' }));
    }
    const restore = () => { this.render = back; back?.(); };
    this.view(() => {
      this.narrator.setScene('bridge-' + kind);
      const programs = ISLANDS.flatMap(i => i.programs.filter(p => p.bridges.includes(kind)).map(p => ({ i, p })));
      const partners = ['ASE · 日月光', 'Tong Yang · 東陽', 'Sinpro · 星博電子', 'Honxin · 洪興研磨', 'Shyh Hwa · 世華金屬'];
      this.ui.panel({ key: 'pathway-' + kind, tall: true, eyebrow: t(b.tag), title: kind === 'ifp' ? (I18N.lang === 'zh' ? '華語先修島' : 'Mandarin foundation island') : (I18N.lang === 'zh' ? '從企業需求出發' : 'A route connected to industry'), body: [
        photo(kind === 'ifp' ? META.ifpPhoto : 'assets/photos/ai-center.webp', t(b.tag)), el('p', { class: 'lead' }, t(b.how)),
        el('div', { class: 'route-ribbon' }, ...(kind === 'ifp' ? [I18N.lang === 'zh' ? '1 年 · 720 小時華語' : '1 year · 720 hours Mandarin', 'TOCFL A2', I18N.lang === 'zh' ? '4 年 · 核定學士班' : '4-year approved degree'] : [I18N.lang === 'zh' ? '申請與企業媒合' : 'Application & company matching', I18N.lang === 'zh' ? '1 年在校' : '1 year on campus', I18N.lang === 'zh' ? '1 年企業實習' : '1 year internship', I18N.lang === 'zh' ? '依約在台工作' : 'Employment agreement']).map(text => el('span', {}, text))),
        el('p', { class: 'note' }, t(b.who)), el('p', { class: 'note' }, t(b.chinese)), b.rule ? el('p', { class: 'note' }, t(b.rule)) : null,
        kind === 'ifp' ? el('p', { class: 'note' }, I18N.lang === 'zh' ? '先修不是獨立學位；銜接核定科系須符合語言與修業規定，並非先修後可任選全校科系。' : 'The foundation year is not a degree. Progression is to approved programs under language and study rules, rather than unrestricted access to every department.') : el('div', {}, el('h3', {}, I18N.lang === 'zh' ? '官網列示的合作企業' : 'Partners listed on the official site'), el('div', { class: 'chips partner-list' }, partners.map(name => el('span', { class: 'tag' }, name))), el('p', { class: 'note' }, I18N.lang === 'zh' ? '企業名單是整體計畫資訊；個人媒合、當期名額、津貼與工作義務，需依簡章及簽訂契約確認。' : 'These are program-level partners. Individual matching, places, allowances and obligations follow the intake prospectus and signed agreement.')),
        el('h3', {}, kind === 'ifp' ? (I18N.lang === 'zh' ? '華語島之後，這 13 個科系' : 'After Mandarin: 13 degree choices') : (I18N.lang === 'zh' ? '2027 春季的 2 個專班' : 'Two spring 2027 programs')),
        el('div', { class: 'programs' }, programs.map(({i,p}) => el('button', { class: 'program', type: 'button', onclick: () => { if (!this.s.bridge) { this.ui.toast(I18N.lang === 'zh' ? '先完成入學路徑選擇，再探索銜接科系。' : 'Choose an admission route first, then explore the programs.'); return; } this.focusIsland(i.id, p.id); } }, el('span', { class: 'pn' }, t(p.name)), el('span', { class: 'pf' }, t(i.name) + ' · ' + t(p.focus))))),
        link(I18N.lang === 'zh' ? '官方完整說明' : 'Official details', b.infoUrl),
        kind === 'intense' ? link(I18N.lang === 'zh' ? '2027 春季招生簡章' : 'Spring 2027 prospectus', b.prospectusUrl) : null,
      ].filter(Boolean), foot: [button(t(UI.back), restore, { kind: 'quiet small' }), travel ? button(I18N.lang === 'zh' ? '前往科系群島' : 'Go to the degree islands', () => this.islandsStep(), { iconName: 'arrow' }) : null].filter(Boolean) });
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
    const app = this.app;
    const token = this.exploreToken = (this.exploreToken || 0) + 1;
    this.setProgress(3); this.narrator.setScene('islands');
    const go = id => id === 'ifp-stop' ? this.pathwayStep('ifp', () => this.islandsStep(), true) : this.focusIsland(id);
    app.handlers = { island: go, program: (id, pid) => this.focusIsland(id, pid) };
    this.islandLabels(go, { dimUnreached: true });
    app.labels.hotspot('ifp-stop', app.arch.foundation.anchorObj, I18N.lang === 'zh' ? '華語先修島 · IFP' : 'Mandarin foundation · IFP', () => go('ifp-stop'), { className: 'island foundation', noStem: true });
    for (const isl of app.arch.islands) app.arch.setPrograms(isl, p => programStatus(p, this.s).ready);
    const target = WORLD.islands.clone().add(V(0, -6, 0));
    const flight = app.fly(app.frameView(target, 65, V(0, 0.9, 1)), target, 2.0);
    this.view(() => {
      this.narrator.setScene('islands');
      this.ui.panel({ key: 'islands', tall: true, eyebrow: t(UI.chapters[3]), title: t(UI.islandsTitle), body: [
        el('p', { class: 'note' }, t(UI.islandsHint)),
        el('p', { class: 'route-current' }, t(BRIDGES[this.s.bridge].name), ' · ', this.s.answers.lang === 'en' ? t(UI.langEn) : this.s.bridge === 'ifp' ? (I18N.lang === 'zh' ? '先學華語，再讀中文科系' : 'Mandarin first, then Chinese-taught study') : this.s.answers.lang === 'zh' ? t(UI.langZh) : (I18N.lang === 'zh' ? '語言待準備' : 'Language preparation needed')),
        this.pathwayCards(),
        el('div', { class: 'options grid2' }, ISLANDS.map(isl => {
          const n = isl.programs.filter(p => programStatus(p, this.s).ready).length;
          return el('button', { class: 'option' + (this.s.visited.has(isl.id) ? ' on' : ''), type: 'button', onclick: () => go(isl.id) }, el('span', { class: 'dot', style: { background: isl.color } }, t(isl.name).slice(0, 1)), el('span', {}, el('div', { class: 't' }, t(isl.name)), el('div', { class: 's' }, `${n} / ${isl.programs.length} ` + (I18N.lang === 'zh' ? '盞燈亮起' : 'programs lit'))));
        })),
        el('p', { class: 'note catalog-scope' }, I18N.lang === 'zh' ? '收錄 2026–2027 外國學生簡章所列系所與 2027 春季 INTENSE，共 38 個探索入口。點燈為初步篩選，正式資格與開班依當期簡章。' : '38 entries cover departments in the 2026–27 international prospectus and spring 2027 INTENSE. Lights are an initial screen; the current prospectus determines eligibility and availability.'),
        link(I18N.lang === 'zh' ? '全校學術單位' : 'All university academic units', 'https://www.isu.edu.tw/academics'),
      ], foot: [button(I18N.lang === 'zh' ? '調整入學路徑' : 'Change admission route', () => this.bridgeStep(), { kind: 'quiet small' })] });
    });
    await flight;
    if (token === this.exploreToken) app.orbit(true, { target, min: 60, max: 340, autoRotate: true });
  }

  async focusIsland(id, initialProgram = null) {
    const app = this.app, isl = app.arch.byId(id);
    if (!isl) return;
    const token = this.exploreToken = (this.exploreToken || 0) + 1;
    this.setProgress(3); this.narrator.setScene(null); app.orbit(false);
    this.s.programSelections ||= {};
    let selected = initialProgram || this.s.programSelections[id] || null;
    let tab = 'intro', filter = 'all';
    const f = this.frameIsland(isl, 1.6, 0.48);
    const tr = this.placeTraveler(isl.group, this.landing(isl), 1.5);
    tr.setStage('student');
    this.s.visited.add(id);
    const flight = app.fly(f.pos, f.look, 1.8);
    const choose = pid => {
      selected = pid; tab = 'intro'; this.s.programSelections[id] = pid;
      sound.select(); tr.setStage('student'); tr.wave(1); this.render();
    };
    app.handlers = { island: other => other === 'ifp-stop' ? this.pathwayStep('ifp', () => this.islandsStep(), true) : other !== id && this.focusIsland(other), program: (other, pid) => other === id ? choose(pid) : this.focusIsland(other, pid) };
    const programLabels = () => this.labels(() => {
      isl.def.programs.forEach((p, index) => {
        const status = programStatus(p, this.s);
        const visible = filter === 'all' || (filter === 'ready' ? status.ready : p.lang === filter);
        if (!visible) return;
        const short = I18N.lang === 'zh' ? p.name.zh.replace('學士學位學程', '學程').replace('英語', '').replace('學系', '') : p.name.en.replace(/^(Dept\. of |Program in |International Program on )/, '');
        app.labels.hotspot('p-' + p.id, isl.programAnchors[p.id], `${String(index + 1).padStart(2, '0')} · ${short}`, () => choose(p.id), { compactText: `${String(index + 1).padStart(2, '0')} · ${p.lang === 'en' ? 'EN' : '中'}`, className: 'program-pin' + (status.ready ? ' lit' : '') + (selected === p.id ? ' selected' : ''), small: status.ready ? (I18N.lang === 'zh' ? '● 初步相符' : '● Initial match') : p.lang === 'en' ? 'EN' : '中文', aria: t(p.name) + (status.ready ? (I18N.lang === 'zh' ? '，初步相符，開啟科系' : ', initial match, open program') : (I18N.lang === 'zh' ? '，開啟科系介紹' : ', open program introduction')) });
      });
    });
    this.view(() => {
      const d = isl.def;
      const sel = d.programs.find(p => p.id === selected);
      const status = sel ? programStatus(sel, this.s) : null;
      app.arch.setPrograms(isl, p => programStatus(p, this.s).ready, selected);
      const filters = [['all', I18N.lang === 'zh' ? '全部' : 'All'], ['en', I18N.lang === 'zh' ? '英文授課' : 'English'], ['zh', I18N.lang === 'zh' ? '中文授課' : 'Chinese'], ['ready', I18N.lang === 'zh' ? '亮燈科系' : 'Lit programs']];
      const filterBar = el('div', { class: 'chips program-filters', role: 'group', 'aria-label': I18N.lang === 'zh' ? '科系篩選' : 'Program filter' }, filters.map(([value, label]) => el('button', { class: 'chip' + (filter === value ? ' on' : ''), type: 'button', 'aria-pressed': String(filter === value), onclick: () => { filter = value; this.render(); } }, label)));
      const visible = d.programs.filter(p => filter === 'all' || (filter === 'ready' ? programStatus(p, this.s).ready : p.lang === filter));
      const cards = el('div', { class: 'programs program-directory' }, visible.map((p) => {
        const lit = programStatus(p, this.s).ready;
        return el('button', { class: 'program program-choice' + (lit ? ' lit' : ' muted') + (selected === p.id ? ' on' : ''), type: 'button', 'data-program-id': p.id, 'aria-pressed': String(selected === p.id), onclick: () => choose(p.id) },
          el('span', { class: 'program-lamp' + (lit ? ' on' : ''), 'aria-hidden': 'true' }), el('span', { class: 'pn' }, t(p.name)), el('span', { class: 'pf' }, t(p.focus)),
          el('span', { class: 'meta' }, el('span', { class: 'tag' }, p.lang === 'en' ? t(UI.langEn) : p.id === 'aj' ? (I18N.lang === 'zh' ? '中文／日文' : 'Chinese / Japanese') : t(UI.langZh)), el('span', { class: 'tag' }, t(levelLabel(p))), el('span', { class: 'tag' + (lit ? ' gold' : '') }, lit ? (I18N.lang === 'zh' ? '初步相符' : 'Initial match') : (I18N.lang === 'zh' ? '可探索 · 另有條件' : 'Explore · Conditions apply'))));
      }));
      const special=visible.filter(p=>p.level==='intense');
      if(special.length) {
        const box=el('section',{class:'other-options program-other-options','aria-label':'Other Options'},el('h3',{},'Other Options'),el('p',{class:'note'},I18N.lang==='zh'?'企業合作專班 · INTENSE':'Industry partnership programs · INTENSE'));
        for(const p of special) box.append(cards.querySelector(`[data-program-id="${p.id}"]`));
        cards.append(box);
      }
      const list = [el('p', { class: 'note' }, t(UI.islandsHint)), filterBar, el('p', { class: 'directory-count' }, `${visible.length} / ${d.programs.length} ` + (I18N.lang === 'zh' ? '個科系／學程' : 'programs')), visible.length ? cards : el('p', { class: 'empty-state' }, I18N.lang === 'zh' ? '這座島目前沒有符合此篩選的科系。切換「全部」仍可探索每個系所。' : 'No programs match this filter on this island. Choose All to explore every program.')];
      let body, foot;
      if (!sel) {
        body = [el('p', { class: 'lead' }, t(d.landmark)), ...list];
        foot = [button(t(UI.backToIslands), () => this.islandsStep(), { kind: 'quiet small' })];
      } else {
        const profile = PROGRAM_PROFILES[sel.id];
        const tabs = [['intro', I18N.lang === 'zh' ? '認識科系' : 'About'], ['day', t(UI.stationDay)], ['years', t(yearsLabel(sel))], ['future', t(UI.stationFuture)]];
        const selectTab = value => { tab = value; if (value === 'years') { tr.setStage('graduate'); tr.cheer(1); } else if (value === 'future') tr.setStage('pro', id); else tr.setStage('student'); this.render(); };
        let content;
        if (tab === 'intro') content = [el('p', { class: 'lead' }, t(profile.intro)), el('h3', {}, I18N.lang === 'zh' ? '這樣的你，可能會喜歡' : 'You might enjoy this if…'), el('p', {}, t(profile.fit)), el('h3', {}, I18N.lang === 'zh' ? '你會探索的能力' : 'Skills to explore'), el('ul', { class: 'skill-list' }, profile.skills.map(s => el('li', {}, t(s))))];
        if (tab === 'day') content = [el('p', { class: 'note' }, I18N.lang === 'zh' ? '想像你在這個科系的一天' : 'Imagine a day in this program'), el('div', { class: 'day' }, profile.day.map((m, i) => el('div', { class: 'moment', style: { animationDelay: i * 0.1 + 's' } }, el('span', { class: 'clock' }, ['09:00','14:00','19:00'][i]), el('span', {}, t(m)))))];
        if (tab === 'years') content = [el('p', { class: 'note' }, t(BRIDGES[this.s.bridge].tag) + ' · ' + t(levelLabel(sel))), el('ul', { class: 'timeline' }, programJourney(sel, this.s.bridge).map((m, i) => el('li', { style: { animationDelay: i * 0.08 + 's' } }, el('b', {}, t(m.title)), el('div', {}, t(m.body)))))];
        if (tab === 'future') content = [el('p', { class: 'lead' }, t(profile.future)), el('p', {}, t(LIFE_CARDS.find(l => l.id === this.s.life)?.scene)), el('p', { class: 'note' }, I18N.lang === 'zh' ? '這是可能的發展方向，可以隨學習與作品慢慢調整。' : 'These are possible directions that can change as you learn and build your work.')];
        const conditions = [];
        if (!status.route) conditions.push(I18N.lang === 'zh' ? '需改走：' + sel.bridges.map(k => t(BRIDGES[k].tag)).join('、') : 'Requires: ' + sel.bridges.map(k => t(BRIDGES[k].tag)).join(', '));
        if (!status.language) conditions.push(I18N.lang === 'zh' ? '此系需要' + (sel.lang === 'en' ? '英文' : '中文') + '授課能力' : 'Teaching language: ' + (sel.lang === 'en' ? 'English' : 'Chinese'));
        if (!status.education) conditions.push(I18N.lang === 'zh' ? '需具備對應的前一階段學歷，詳見簡章' : 'Previous-degree requirements apply; see the prospectus');
        if (!status.eligible) conditions.push(I18N.lang === 'zh' ? '目前背景未符合所選管道的初篩' : 'Your background does not match the selected route screen');
        body = [
          button('‹ ' + (I18N.lang === 'zh' ? '這座島的所有科系' : 'All programs on this island'), () => { selected = null; this.render(); }, { kind: 'quiet small' }),
          el('div', { class: 'program-heading', style: { '--island-color': d.color } }, el('div', { class: 'meta' }, el('span', { class: 'tag' }, t(levelLabel(sel))), el('span', { class: 'tag' }, sel.lang === 'en' ? t(UI.langEn) : sel.id === 'aj' ? (I18N.lang === 'zh' ? '中文／日文' : 'Chinese / Japanese') : t(UI.langZh)), el('span', { class: 'tag' }, sel.campus === 'medical' ? t(UI.medicalCampus) : t(UI.mainCampus)))),
          link(t(UI.visitSite), sel.url, { kind: 'indigo small' }),
          el('div', { class: 'program-tabs', role: 'tablist', 'aria-label': I18N.lang === 'zh' ? '科系內容' : 'Program details' }, tabs.map(([value,label]) => el('button', { id: 'tab-' + value, type: 'button', class: tab === value ? 'on' : '', role: 'tab', 'aria-selected': String(tab === value), 'aria-controls': 'program-detail', tabindex: tab === value ? '0' : '-1', onclick: () => selectTab(value), onkeydown: e => { if (!['ArrowRight','ArrowLeft','Home','End'].includes(e.key)) return; e.preventDefault(); const current = tabs.findIndex(x => x[0] === tab); const next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (current + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length; selectTab(tabs[next][0]); this.ui.panelEl.querySelector('#tab-' + tabs[next][0]).focus(); } }, label))),
          el('div', { id: 'program-detail', class: 'program-detail', role: 'tabpanel', 'aria-labelledby': 'tab-' + tab }, ...content),
          el('div', { class: 'admission-status' + (status.ready ? ' ready' : '') }, el('b', {}, status.ready ? (I18N.lang === 'zh' ? '● 與目前路徑、語言及學歷初步相符' : '● Initial route, language and education match') : (I18N.lang === 'zh' ? '○ 可以探索，申請條件需要調整' : '○ Explore this program; admission conditions need attention')), ...conditions.map(c => el('p', {}, c))),
          button(I18N.lang === 'zh' ? '調整語言與入學路徑' : 'Change language and admission route', () => this.bridgeStep(), { kind: 'quiet small' }),
          el('p', { class: 'note' }, t(UI.perSemester) + '：' + (sel.fee ? 'NT$' + sel.fee.toLocaleString() : (I18N.lang === 'zh' ? '依當期公告與獎助核定' : 'See current fees and scholarship award'))),
          el('p', { class: 'note scenario-note' }, I18N.lang === 'zh' ? '一天與學習歷程為科系特色延伸的探索情境，非正式課表。實習、修課順序、修業年限與畢業條件請看系所公告；研究所依研究進度安排。' : 'Day and study journeys are exploratory scenarios, not official timetables. Courses, placements, duration and graduation requirements follow department announcements; graduate progress varies.'),
          el('details', { class: 'other-programs' }, el('summary', {}, I18N.lang === 'zh' ? '比較這座島的其他科系' : 'Compare other programs on this island'), ...list),
        ];
        foot = [button(t(UI.backToIslands), () => this.islandsStep(), { kind: 'quiet small' }), button(t(UI.plantFlag), () => { this.s.flag = { islandId: id, programId: sel.id }; sound.flag(); this.routeStep(); }, { iconName: 'flag', disabled: !status.ready })];
      }
      this.ui.panel({ key: 'island-' + id + '-' + (selected || 'directory'), tall: true, eyebrow: t(d.name) + ' · ' + t(d.industry), title: sel ? t(sel.name) : t(d.name), body, foot });
      programLabels();
    });
    await flight;
    if (token === this.exploreToken) app.orbit(true, { target: f.look, min: 14, max: 120, minPolar: 0.3, maxPolar: 1.45 });
  }

  // camera close-up on the traveler, from the island's outer side
  closeUp(isl) {
    const app = this.app;
    const p = app.traveler.group.getWorldPosition(V(0, 0, 0)).add(V(0, 1.4, 0));
    const out = isl.home.clone().setY(0).normalize();
    const side = V(-out.z, 0, out.x);
    const dir = out.multiplyScalar(0.8).add(side.multiplyScalar(0.5)).setY(0.42);
    app.orbit(false);
    return app.fly(app.frameView(p, 4.8, dir), p, 1.5).then(() => app.orbit(true, { target: p, min: 5, max: 60, minPolar: 0.3, maxPolar: 1.45 }));
  }

  landing(isl) {
    const x = isl.radius * 0.5, z = 0.4;
    return V(x, isl.sy(x, z) - 0.1, z);
  }

  // ---------- chapter 4: route card ----------
  async routeStep() {
    this.narrator.setScene(null);
    const app = this.app;
    this.setProgress(4);
    app.orbit(false);
    app.handlers = {};
    app.labels.clear();
    const isl = app.arch.byId(this.s.flag.islandId);
    app.arch.setBeacon(isl, true);
    const tr = app.traveler;
    if (tr.group.parent !== isl.group) this.placeTraveler(isl.group, this.landing(isl), 1.5);
    tr.setStage('pro', isl.def.id);
    tr.cheer(2.2);
    app.skyEnv.setMood('dusk', 3);
    const f = this.frameIsland(isl, 3.4, 0.6);
    app.fly(f.pos, WORLD.islands.clone().add(V(0, -4, 0)), 3.2);
    const canvas = document.createElement('canvas');
    const preview = el('img', { class: 'route-preview', alt: t(UI.routeTitle) });
    const redraw = async () => { await drawRouteCard(canvas, this.s); preview.src = canvas.toDataURL('image/jpeg', 0.85); };
    let timer;
    const b = BRIDGES[this.s.bridge];
    const isl2 = ISLANDS.find((i) => i.id === this.s.flag.islandId);
    const prog = isl2.programs.find((p) => p.id === this.s.flag.programId);
    const mail = () => {
      const lines = [t(UI.askBody), '', `${t(UI.routeFrom)}: ${this.s.homeLabel || '-'}`, `${t(UI.future)}: ${t(PROGRAM_PROFILES[prog.id].future)}`, `${t(UI.program)}: ${t(prog.name)}`, `${t(UI.yourBridge)}: ${t(b.name)} (${t(b.tag)})`];
      return `mailto:${META.contactEmail}?subject=${encodeURIComponent(t(UI.askSubject))}&body=${encodeURIComponent(lines.join('\n'))}`;
    };
    this.view(() => {
      const input = el('input', { id: 'route-name', type: 'text', maxlength: 28, value: this.s.name, autocomplete: 'off', placeholder: I18N.lang === 'zh' ? '例如：Linh' : 'e.g. Linh' });
      input.addEventListener('input', () => { this.s.name = input.value; clearTimeout(timer); timer = setTimeout(redraw, 250); });
      this.ui.panel({
        tall: true, eyebrow: t(UI.chapters[4]), title: t(UI.routeTitle),
        body: [el('div', { class: 'route-wrap' },
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
      });
      redraw();
    });
  }

  replay() {
    const app = this.app;
    this.s.career = null; this.s.life = null; this.s.flag = null; this.s.stations = {};
    app.arch.setBeacon(null, false);
    app.skyEnv.setMood('golden', 2);
    this.travelerToCampus().setStage('student');
    this.careerStep();
    app.fly(this.app.frameView(WORLD.islands.clone().add(V(0, -6, 0)), 62, V(0, 0.95, 1)), WORLD.islands.clone().add(V(0, -6, 0)), 2.4);
  }
}
