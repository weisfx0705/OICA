import * as THREE from 'three';
import { tween, easeInOut, glowTexture, clamp } from '../util.js';

// The player's avatar: a low-poly traveler who sets off with a big backpack and grows up
// through the game — student on campus, graduate after four years, professional ten years on.
export const SKINS = ['#F6D3B6', '#E8B48F', '#C98C64', '#9C6644', '#6E4630'];
export const OUTFITS = ['#36348E', '#E07A5F', '#3E9E86', '#D9A23B', '#8A6CC4'];
const HAIR = '#2B2321';

const mat = (c, extra = {}) => new THREE.MeshLambertMaterial({ color: c, ...extra });
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const cyl = (rt, rb, h, m, seg = 10) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
const ball = (r, m, d = 1) => new THREE.Mesh(new THREE.IcosahedronGeometry(r, d), m);

export class Traveler {
  constructor() {
    this.group = new THREE.Group();
    this.root = new THREE.Group(); // animated body
    this.group.add(this.root);
    this.m = {
      skin: mat(SKINS[1]), outfit: mat(OUTFITS[0]), pants: mat('#2E3550'), shoe: mat('#F4F1EA'),
      hair: mat(HAIR), pack: mat('#D9A23B'), strap: mat('#5B4636'), white: mat('#FFFFFF'), gold: mat('#FFC53A'), ink: mat('#23215F'),
    };
    this.build();
    this.mode = 'idle';
    this.t = 0;
    this.stage = 'traveler';
    this.setStage('traveler');

    // a soft gold disc so players can always spot themselves
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.55, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#FFC53A', transparent: true, opacity: 0.8, depthWrite: false }));
    ring.position.y = 0.02;
    this.ring = ring;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#FFE3A3', transparent: true, opacity: 0.35, depthWrite: false }));
    glow.scale.setScalar(2.4);
    glow.position.y = 0.8;
    this.group.add(ring, glow);
    this.group.traverse((o) => { if (o.isMesh && o !== ring) o.castShadow = true; });
  }

  build() {
    const m = this.m, R = this.root;
    // legs pivot at hips
    this.legs = [-0.12, 0.12].map((x) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.62, 0);
      const leg = box(0.16, 0.5, 0.18, m.pants); leg.position.y = -0.27;
      const shoe = box(0.18, 0.12, 0.26, m.shoe); shoe.position.set(0, -0.56, 0.04);
      pivot.add(leg, shoe);
      R.add(pivot);
      return pivot;
    });
    // torso
    this.torso = new THREE.Group();
    this.torso.position.y = 0.62;
    R.add(this.torso);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.32, 3, 10), m.outfit);
    body.scale.set(1.15, 1, 0.85);
    body.position.y = 0.3;
    this.body = body;
    this.torso.add(body);
    // ISU chest logo (shown as a student)
    this.logo = box(0.16, 0.1, 0.02, m.white);
    this.logo.position.set(0, 0.42, 0.18);
    this.torso.add(this.logo);
    // arms pivot at shoulders
    this.arms = [-1, 1].map((s) => {
      const pivot = new THREE.Group();
      pivot.position.set(0.29 * s, 0.56, 0);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.32, 2, 6), m.outfit);
      arm.position.y = -0.2;
      const hand = ball(0.075, m.skin, 0);
      hand.position.y = -0.42;
      pivot.add(arm, hand);
      pivot.rotation.z = 0.12 * s;
      this.torso.add(pivot);
      return pivot;
    });
    // head
    this.head = new THREE.Group();
    this.head.position.y = 0.95;
    this.torso.add(this.head);
    const face = ball(0.26, m.skin, 2);
    face.scale.set(1, 1.02, 0.95);
    face.position.y = 0.2;
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.275, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), m.hair);
    hair.position.set(0, 0.23, -0.015);
    hair.rotation.x = -0.25;
    const eyes = [-0.09, 0.09].map((x) => { const e = ball(0.03, m.ink, 0); e.position.set(x, 0.21, 0.235); return e; });
    const blush = [-0.15, 0.15].map((x) => { const b = ball(0.035, mat('#F29A8E'), 0); b.position.set(x, 0.13, 0.215); b.scale.set(1, 0.6, 0.4); return b; });
    this.head.add(face, hair, ...eyes, ...blush);
    this.hair = hair;

    // ---- outfit pieces toggled by growth stage ----
    // big travel backpack with bedroll
    this.bigPack = new THREE.Group();
    const pack = box(0.42, 0.52, 0.26, m.pack); pack.position.set(0, 0.32, -0.3);
    const flap = box(0.44, 0.14, 0.28, mat('#C2552E')); flap.position.set(0, 0.6, -0.3);
    const roll = cyl(0.1, 0.1, 0.5, mat('#3E9E86')); roll.rotation.z = Math.PI / 2; roll.position.set(0, 0.74, -0.3);
    const pocket = box(0.26, 0.16, 0.06, mat('#C2552E')); pocket.position.set(0, 0.18, -0.45);
    const straps = [-0.12, 0.12].map((x) => { const s = box(0.05, 0.42, 0.04, m.strap); s.position.set(x, 0.34, 0.17); return s; });
    this.bigPack.add(pack, flap, roll, pocket, ...straps);
    this.torso.add(this.bigPack);
    // traveler cap
    this.cap = new THREE.Group();
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#C2552E'));
    const brim = cyl(0.2, 0.2, 0.03, mat('#C2552E'), 14); brim.scale.set(1, 1, 1.2); brim.position.set(0, 0, 0.2);
    this.cap.add(crown, brim);
    this.cap.position.y = 0.3;
    this.head.add(this.cap);
    // small student backpack
    this.smallPack = box(0.32, 0.36, 0.16, mat('#FFC53A'));
    this.smallPack.position.set(0, 0.32, -0.24);
    this.torso.add(this.smallPack);
    // graduation cap with tassel
    this.mortar = new THREE.Group();
    const board = box(0.5, 0.04, 0.5, m.ink); board.position.y = 0.42; board.rotation.y = Math.PI / 4;
    const base = cyl(0.2, 0.22, 0.12, m.ink, 12); base.position.y = 0.36;
    const tassel = box(0.025, 0.2, 0.025, m.gold); tassel.position.set(0.22, 0.32, 0.1);
    this.mortar.add(board, base, tassel);
    this.head.add(this.mortar);
    this.gown = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.36, 0.62, 12, 1, true), mat('#23215F', { side: THREE.DoubleSide }));
    this.gown.position.y = 0.16;
    this.torso.add(this.gown);
    // career accessories (one per island)
    this.gear = new THREE.Group();
    this.head.add(this.gear);
    this.handGear = new THREE.Group();
    this.arms[1].add(this.handGear);
    this.handGear.position.y = -0.46;
  }

  setLook({ skin, outfit }) {
    if (skin) this.m.skin.color.set(skin);
    if (outfit) { this.m.outfit.color.set(outfit); this.outfitColor = outfit; }
  }

  // traveler → student → graduate → pro (with an island-specific accessory)
  setStage(stage, islandId) {
    this.stage = stage;
    this.bigPack.visible = this.cap.visible = stage === 'traveler';
    this.smallPack.visible = this.logo.visible = stage === 'student';
    this.mortar.visible = this.gown.visible = stage === 'graduate';
    this.gear.clear(); this.handGear.clear(); this.clearExtras();
    if (stage === 'pro') this.addGear(islandId);
  }

  addGear(id) {
    const m = this.m;
    const H = this.gear, Hand = this.handGear;
    if (id === 'maker') { const hat = new THREE.Mesh(new THREE.SphereGeometry(0.29, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#F2B33D')); hat.position.y = 0.3; const brim = cyl(0.33, 0.33, 0.03, mat('#F2B33D'), 14); brim.position.y = 0.3; H.add(hat, brim); }
    if (id === 'leisure') { const band = cyl(0.24, 0.24, 0.12, m.white, 12); band.position.y = 0.4; const puff = ball(0.26, m.white, 1); puff.position.y = 0.6; puff.scale.set(1.1, 0.8, 1.1); H.add(band, puff); }
    if (id === 'health') { const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.33, 0.66, 12, 1, true), mat('#FFFFFF', { side: THREE.DoubleSide })); coat.position.y = 0.2; this.torso.add(coat); this._coat = coat; const cross = box(0.1, 0.03, 0.02, mat('#2E8A63')); cross.position.set(0.1, 0.45, 0.2); this.torso.add(cross); this._cross = cross; }
    if (id === 'chip') { const goggles = box(0.42, 0.08, 0.06, mat('#7FD3EA')); goggles.position.set(0, 0.24, 0.23); H.add(goggles); const wafer = cyl(0.16, 0.16, 0.02, mat('#C7D2F2'), 20); wafer.rotation.x = Math.PI / 2; Hand.add(wafer); }
    if (id === 'code') { const phones = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.03, 6, 20, Math.PI), m.ink); phones.position.y = 0.22; const cups = [-0.28, 0.28].map((x) => { const c = ball(0.07, mat('#9C8FE0'), 0); c.position.set(x, 0.2, 0); return c; }); H.add(phones, ...cups); const laptop = box(0.26, 0.02, 0.18, mat('#C9CFD8')); Hand.add(laptop); }
    if (id === 'story') { const beret = ball(0.24, mat('#A8457A'), 1); beret.scale.set(1.2, 0.35, 1.2); beret.position.set(0.04, 0.42, 0); H.add(beret); const clap = box(0.2, 0.14, 0.03, m.ink); Hand.add(clap); }
    if (id === 'business') { const tie = box(0.06, 0.24, 0.02, mat('#C2552E')); tie.position.set(0, 0.32, 0.2); this.torso.add(tie); this._tie = tie; const bag = box(0.28, 0.2, 0.08, mat('#5B4636')); bag.position.y = -0.08; Hand.add(bag); }
  }

  clearExtras() { for (const k of ['_coat', '_cross', '_tie']) if (this[k]) { this.torso.remove(this[k]); this[k] = null; } }

  // ---------- movement ----------
  face(target) {
    const p = this.group.getWorldPosition(new THREE.Vector3());
    const dx = target.x - p.x, dz = target.z - p.z;
    if (Math.abs(dx) + Math.abs(dz) < 1e-4) return;
    this.group.rotation.y = Math.atan2(dx, dz);
  }

  // arc jump in world space (used to hop onto islands); reparents to `parent` on landing
  hop(parent, localTarget, duration = 2.2) {
    const scene = this.group.parent;
    const start = this.group.getWorldPosition(new THREE.Vector3());
    const end = parent.localToWorld(localTarget.clone());
    if (scene && !scene.isScene) { let s = scene; while (s.parent) s = s.parent; s.attach(this.group); }
    this.face(end);
    this.mode = 'jump';
    const height = Math.max(8, start.distanceTo(end) * 0.35);
    return tween({ duration, ease: easeInOut, onUpdate: (e) => {
      const live = parent.localToWorld(localTarget.clone());
      this.group.position.lerpVectors(start, live, e);
      this.group.position.y += Math.sin(Math.PI * e) * height;
      this.root.rotation.x = Math.sin(Math.PI * e) * 0.5;
    } }).then(() => {
      parent.attach(this.group);
      this.group.position.copy(localTarget);
      this.root.rotation.x = 0;
      this.mode = 'idle';
    });
  }

  walkTo(localTarget, duration = 1.6) {
    const from = this.group.position.clone();
    const dx = localTarget.x - from.x, dz = localTarget.z - from.z;
    if (Math.hypot(dx, dz) > 0.01) this.group.rotation.y = Math.atan2(dx, dz);
    this.mode = 'walk';
    return tween({ duration, ease: (k) => k, onUpdate: (e) => this.group.position.lerpVectors(from, localTarget, e) }).then(() => { this.mode = 'idle'; });
  }

  wave(seconds = 1.6) { this.mode = 'wave'; clearTimeout(this._w); this._w = setTimeout(() => { if (this.mode === 'wave') this.mode = 'idle'; }, seconds * 1000); }
  cheer(seconds = 1.4) { this.mode = 'cheer'; clearTimeout(this._w); this._w = setTimeout(() => { if (this.mode === 'cheer') this.mode = 'idle'; }, seconds * 1000); }

  update(dt) {
    this.t += dt;
    const t = this.t;
    const [ll, lr] = this.legs, [al, ar] = this.arms;
    let bob = Math.sin(t * 2.2) * 0.015;
    let legSwing = 0, armL = -0.12, armR = 0.12, armLx = 0, armRx = 0, lift = 0;
    if (this.mode === 'walk') {
      legSwing = Math.sin(t * 9) * 0.55;
      armLx = -legSwing * 0.8; armRx = legSwing * 0.8;
      bob = Math.abs(Math.sin(t * 9)) * 0.06;
    } else if (this.mode === 'wave') {
      armR = 2.6 + Math.sin(t * 10) * 0.35;
    } else if (this.mode === 'cheer') {
      armL = -2.7; armR = 2.7;
      lift = Math.abs(Math.sin(t * 7)) * 0.25;
    } else if (this.mode === 'jump') {
      armL = -1.2; armR = 1.2; legSwing = 0.4;
    }
    ll.rotation.x = legSwing; lr.rotation.x = -legSwing;
    al.rotation.z = armL; ar.rotation.z = armR; al.rotation.x = armLx; ar.rotation.x = armRx;
    this.root.position.y = bob + lift;
    this.head.rotation.y = this.mode === 'idle' ? Math.sin(t * 0.6) * 0.25 : 0;
    this.ring.material.opacity = 0.55 + Math.sin(t * 3) * 0.25;
    this.ring.scale.setScalar(1 + Math.sin(t * 3) * 0.06);
    this.ring.visible = this.mode !== 'jump';
  }
}

export const clampScale = (s) => clamp(s, 0.4, 6);
