import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { I18N, updateTweens, tween, easeInOut, storage, el } from './util.js';
import { Sky } from './world/sky.js';
import { Globe } from './world/globe.js';
import { buildTaiwan } from './world/taiwan.js';
import { buildKaohsiung } from './world/kaohsiung.js';
import { buildCampus } from './world/campus.js';
import { Archipelago } from './world/islands.js';
import { Labels } from './labels.js';
import { UIRoot } from './ui.js';
import { Flow } from './flow.js';
import { WORLD } from './world/layout.js';
import { sound } from './audio.js';
import { Traveler } from './world/traveler.js';

// ---------- quality profile ----------
function detectQuality() {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const small = Math.min(innerWidth, innerHeight) < 760;
  const mobile = coarse || small;
  const weak = (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  const stored = storage.get('isu-lite', null);
  const lite = stored ?? (mobile && weak);
  const dpr = window.devicePixelRatio || 1;
  return {
    mobile, lite,
    pixelRatio: Math.min(dpr, lite ? 1.25 : mobile ? 1.6 : 2),
    shadows: !lite,
    shadowSize: mobile ? 1024 : 2048,
    antialias: !lite,
  };
}


class App {
  constructor() {
    this.q = detectQuality();
    const canvas = document.getElementById('scene');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.q.antialias, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.q.pixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = this.q.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 3000);
    this.clock = new THREE.Clock();
    this.time = 0;
    this.look = new THREE.Vector3();
    this.handlers = {};
    this.updaters = [];

    // scenes
    this.globe = new Globe(this.q);
    this.sky = new THREE.Scene();
    this.skyEnv = new Sky(this.sky, this.q);
    this.tw = buildTaiwan(this.q);
    this.tw.group.position.copy(WORLD.taiwan);
    this.khh = buildKaohsiung(this.q);
    this.khh.group.position.copy(WORLD.kaohsiung);
    this.campus = buildCampus(this.q);
    this.campus.group.position.copy(WORLD.campus);
    const setMood = this.skyEnv.setMood.bind(this.skyEnv);
    this.skyEnv.setMood = (m, d) => { sound.setMood(m); return setMood(m, d); };
    this.arch = new Archipelago(WORLD.islands, this.q);
    this.sky.add(this.tw.group, this.khh.group, this.campus.group, this.arch.group);
    this.traveler = new Traveler();
    this.khhBaseY = 0;

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enabled = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = 0.7;

    this.labels = new Labels(document.getElementById('labels'));
    this.ui = new UIRoot(document.getElementById('ui'));
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.wipeEl = document.getElementById('wipe');

    this.bindInput(canvas);
    addEventListener('resize', () => this.resize());
    this.resize();
    this.setStage('campus');
    this.frameTimes = [];
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.75 ? 60 : w / h < 1.2 ? 50 : 42;
    this.camera.updateProjectionMatrix();
    this.w = w; this.h = h;
  }

  // ---------- stages ----------
  setStage(name) {
    this.stageName = name;
    const inSky = name !== 'globe';
    sound.setMood(inSky ? this.skyEnv.mood : 'space');
    this.scene = inSky ? this.sky : this.globe.scene;
    this.tw.group.visible = name === 'taiwan';
    this.khh.group.visible = name === 'kaohsiung';
    this.campus.group.visible = name === 'campus';
    this.arch.group.visible = name === 'campus';
    if (inSky) {
      const c = name === 'taiwan' ? WORLD.taiwan : name === 'kaohsiung' ? WORLD.kaohsiung : WORLD.islands.clone().add(new THREE.Vector3(0, -20, 0));
      this.skyEnv.cloudCenter.copy(c).add(new THREE.Vector3(0, -24, 0));
      const radius = name === 'campus' ? 95 : name === 'taiwan' ? 30 : 34;
      this.skyEnv.fitShadow(name === 'campus' ? WORLD.campus.clone().add(new THREE.Vector3(0, 18, 0)) : c, radius);
      this.sky.fog.near = name === 'campus' ? 160 : 90;
      this.sky.fog.far = name === 'campus' ? 620 : 420;
    }
  }

  async wipe(during) {
    sound.whoosh(1.5);
    this.wipeEl.classList.add('on');
    await new Promise((r) => setTimeout(r, 750));
    await during?.();
    await new Promise((r) => setTimeout(r, 120));
    this.wipeEl.classList.remove('on');
    await new Promise((r) => setTimeout(r, 500));
  }

  // Camera position that fits a sphere of `radius` around `center`, seen from direction `dir`.
  frameView(center, radius, dir, { margin = 1, panel = true } = {}) {
    const vf = THREE.MathUtils.degToRad(this.camera.fov);
    const hf = 2 * Math.atan(Math.tan(vf / 2) * this.camera.aspect);
    const mode = panel ? (this.w <= 760 ? 'bottom' : 'side') : null;
    const ang = Math.min(vf * (mode === 'bottom' ? 0.6 : 1), hf * (mode === 'side' ? 0.74 : 1));
    const dist = (radius * margin) / Math.sin(ang / 2);
    return center.clone().add(dir.clone().normalize().multiplyScalar(dist));
  }

  // Shift the rendered image away from whichever panel is open, so the scene stays visible.
  updateViewOffset() {
    const p = this.ui.panelEl;
    let tx = 0, ty = 0, mode = null;
    if (p && p.classList.contains('in')) {
      const r = p.getBoundingClientRect();
      if (r.width > this.w * 0.8) { mode = 'bottom'; ty = Math.min(r.height * 0.5, this.h * 0.3); }
      else { mode = 'side'; tx = Math.min((r.width + 20) * 0.5, this.w * 0.25); }
    }
    this.panelMode = mode;
    this.ox = (this.ox ?? 0) + (tx - (this.ox ?? 0)) * 0.08;
    this.oy = (this.oy ?? 0) + (ty - (this.oy ?? 0)) * 0.08;
    if (Math.abs(this.ox) < 0.5 && Math.abs(this.oy) < 0.5 && !tx && !ty) { if (this.camera.view?.enabled) this.camera.clearViewOffset(); return; }
    this.camera.setViewOffset(this.w, this.h, this.ox, this.oy, this.w, this.h);
  }

  place(pos, look) {
    this.camera.position.copy(pos);
    this.look.copy(look);
    this.camera.lookAt(this.look);
  }

  fly(pos, look, duration = 2.4, ease = easeInOut) {
    const flightId = this.flightId = (this.flightId || 0) + 1;
    this.controls.enabled = false;
    const p0 = this.camera.position.clone(), l0 = this.look.clone();
    const arc = Math.min(p0.distanceTo(pos) * 0.12, 18);
    return tween({ duration, ease, onUpdate: (e) => {
      if (flightId !== this.flightId) return;
      this.camera.position.lerpVectors(p0, pos, e);
      this.camera.position.y += Math.sin(Math.PI * e) * arc;
      this.look.lerpVectors(l0, look, e);
      this.camera.lookAt(this.look);
    } });
  }

  orbit(on, { target, min = 20, max = 160, minPolar = 0.35, maxPolar = 1.42, autoRotate = false } = {}) {
    const c = this.controls;
    if (!on) { c.enabled = false; c.autoRotate = false; return; }
    if (target) { c.target.copy(target); this.look.copy(target); }
    c.minDistance = min; c.maxDistance = max;
    c.minPolarAngle = minPolar; c.maxPolarAngle = maxPolar;
    c.autoRotate = autoRotate;
    c.autoRotateSpeed = 0.35;
    c.enabled = true;
    c.update();
  }

  // ---------- input ----------
  bindInput(canvas) {
    let down = null;
    canvas.addEventListener('pointerdown', (e) => {
      down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, hit: this.stageName === 'globe' ? null : this.hit(e) };
      if (this.stageName === 'globe') this.globe.dragging = true;
    });
    addEventListener('pointermove', (e) => {
      if (down && this.stageName === 'globe' && this.handlers.globeDrag !== false) {
        this.globe.drag(e.clientX - down.lx, e.clientY - down.ly);
        down.lx = e.clientX; down.ly = e.clientY;
      }
      if (!this.q.mobile && !down) this.hover(e);
    });
    addEventListener('pointerup', (e) => {
      this.globe.dragging = false;
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      const target = down.hit;
      down = null;
      if (moved < 7 && e.target === canvas) this.pick(e, target);
    });
  }

  ray(e) {
    this.pointer.set((e.clientX / this.w) * 2 - 1, -(e.clientY / this.h) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return this.raycaster;
  }

  pickables() {
    if (this.stageName === 'globe') return [];
    const list = [];
    if (this.handlers.island || this.handlers.program) list.push(...this.arch.pickables);
    return list;
  }

  hit(e) {
    const r = this.ray(e);
    if (this.stageName === 'globe') return null;
    const h = r.intersectObjects(this.pickables(), false)[0];
    return h?.object.userData;
  }

  hover(e) {
    if (this._hoverT && performance.now() - this._hoverT < 60) return;
    this._hoverT = performance.now();
    let pointer = false;
    if (this.stageName === 'globe') pointer = !!(this.handlers.globe && this.globe.pick(this.ray(e)));
    else { const u = this.hit(e); pointer = !!(u && (u.islandId)); this.handlers.hover?.(u?.islandId); }
    document.body.style.cursor = pointer ? 'pointer' : '';
  }

  pick(e, hitOverride = undefined) {
    if (this.stageName === 'globe') {
      const ll = this.globe.pick(this.ray(e));
      if (ll && this.handlers.globe) this.handlers.globe(ll);
      return;
    }
    const u = hitOverride === undefined ? this.hit(e) : hitOverride;
    if (u?.programId && this.handlers.program) this.handlers.program(u.islandId, u.programId);
    else if (u?.islandId && this.handlers.island) this.handlers.island(u.islandId);
  }

  // ---------- loop ----------
  start() {
    this.renderer.setAnimationLoop(() => this.frame());
  }

  frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.time += dt;
    updateTweens(dt);
    if (this.stageName === 'globe') this.globe.update(dt);
    else {
      this.skyEnv.update(this.time);
      if (this.tw.group.visible) this.tw.update(dt);
      if (this.khh.group.visible) this.khh.update(dt);
      if (this.campus.group.visible) { this.campus.update(dt); this.arch.update(dt, this.time); }
    }
    for (const f of this.updaters) f(dt, this.time);
    this.traveler.update(dt);
    this.updateViewOffset();
    if (this.controls.enabled) { this.controls.update(); this.look.copy(this.controls.target); }
    this.renderer.render(this.scene, this.camera);
    this.labels.update(this.camera, this.w, this.h);
    this.adapt(dt);
  }

  // lower the resolution if the device can't keep up
  adapt(dt) {
    const f = this.frameTimes;
    f.push(dt);
    if (f.length < 120) return;
    const avg = f.reduce((a, b) => a + b, 0) / f.length;
    f.length = 0;
    const pr = this.renderer.getPixelRatio();
    if (avg > 1 / 38 && pr > 1) {
      this.renderer.setPixelRatio(Math.max(1, pr - 0.25));
      this.resize();
    }
  }
}

// ---------- boot ----------
const loader = el('div', { class: 'loader' }, el('div', { class: 'loader-inner' }, el('img', { src: 'assets/isu-wordmark.png', alt: '義守大學' }), el('div', { class: 'loader-bar' }, el('i'))));
document.body.append(loader);
const bar = loader.querySelector('i');
bar.style.width = '35%';

I18N.lang = storage.get('isu-lang', null) ?? (navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en');
document.documentElement.lang = I18N.lang === 'zh' ? 'zh-Hant-TW' : 'en';

document.addEventListener('click', (e) => {
  if (e.target.closest('.btn, .chip, .option, .program, .hotspot, .mini-bridge, .pill, .lang-switch button')) sound.tap();
}, true);
document.addEventListener('visibilitychange', () => {
  if (!sound.ctx) return;
  if (document.hidden) sound.ctx.suspend(); else if (sound.on) sound.ctx.resume();
});

requestAnimationFrame(() => {
  const app = new App();
  window.__app = app;
  bar.style.width = '80%';
  const flow = new Flow(app);
  app.flow = flow;
  app.start();
  // compile shaders up front so the first transitions don't stutter
  app.renderer.compile(app.sky, app.camera);
  app.renderer.compile(app.globe.scene, app.camera);
  bar.style.width = '100%';
  setTimeout(() => { loader.classList.add('done'); setTimeout(() => loader.remove(), 900); flow.begin(); }, 250);
});
