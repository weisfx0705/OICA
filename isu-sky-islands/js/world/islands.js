import * as THREE from 'three';
import { createAnchorEffect } from './anchor.js';
import { floatingBase } from './base.js';
import { Kit, lambert } from './kit.js';
import { rng, glowTexture, tween, easeOut } from '../util.js';
import { ISLANDS, BRIDGES } from '../content.js';

const DIM = new THREE.Color('#9AA3BF');
const LIT = new THREE.Color('#FFFFFF');

// ---------- themed landmarks for each future ----------
function landmark(id, k, island, anim) {
  const sy = island.sy;
  const at = (x, z) => sy(x, z) - 0.15;
  switch (id) {
    case 'ifp-stop': {
      k.box(4, 2, 3, '#FBF6EE', { x: 0, y: at(0, 0), z: 0 });
      k.roof(4.7, 1.4, 3.7, '#3E9E86', { x: 0, y: at(0, 0) + 2, z: 0 });
      k.box(1.1, 1.6, 0.1, '#E8B26A', { x: 0, y: at(0, 0), z: 1.55 });
      for (let i = 0; i < 3; i++) {
        k.box(1, 0.2 + i * 0.3, 1, '#F2C46D', { x: -2.8 + i * 1.1, y: at(-2, 3), z: 3 });
      }
      break;
    }
    case 'chip': {
      // fab + giant chip + wafer + an airship to ASE
      k.box(5, 1.8, 3, '#F4F6F8', { x: -1, y: at(-1, -1), z: -1 });
      k.box(5.05, 0.22, 3.05, '#7FD3EA', { x: -1, y: at(-1, -1) + 1.1, z: -1 });
      k.cyl(0.5, 0.5, 1.6, '#DDE2E8', { x: 2.4, y: at(2.4, -2), z: -2 }, 10);
      k.cyl(0.5, 0.5, 1.6, '#DDE2E8', { x: 3.5, y: at(3.5, -1.5), z: -1.5 }, 10);
      k.box(2.6, 0.25, 2.6, '#1E2A4A', { x: 0.5, y: at(0.5, 3) + 0.5, z: 3 });
      k.box(1.5, 0.27, 1.5, '#2F3E66', { x: 0.5, y: at(0.5, 3) + 0.62, z: 3 });
      for (let i = 0; i < 6; i++) {
        k.box(0.12, 0.08, 0.5, '#FFC53A', { x: -0.7 + i * 0.48, y: at(0.5, 3) + 0.55, z: 1.55 });
        k.box(0.12, 0.08, 0.5, '#FFC53A', { x: -0.7 + i * 0.48, y: at(0.5, 3) + 0.55, z: 4.45 });
      }
      k.box(0.3, 0.5, 0.3, '#C9CFD8', { x: 0.5, y: at(0.5, 3), z: 3 });
      k.add(new THREE.CylinderGeometry(1.1, 1.1, 0.08, 30), '#C7D2F2', { x: -3.5, y: at(-3.5, 2.5) + 1.3, z: 2.5, rx: 1.2 });
      const ship = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 3.2, 4, 10).rotateZ(Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#F2F0EA' }));
      const gondola = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 0.6), new THREE.MeshLambertMaterial({ color: '#2F6FA8' }));
      gondola.position.y = -1.1;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.08), new THREE.MeshLambertMaterial({ color: '#2F6FA8' }));
      fin.position.set(-2.4, 0.3, 0);
      ship.add(body, gondola, fin);
      ship.position.set(island.radius + 3.5, 3, 1);
      island.group.add(ship);
      anim.push((t) => { ship.position.y = 3 + Math.sin(t * 0.9) * 0.4; ship.rotation.z = Math.sin(t * 0.7) * 0.05; });
      break;
    }
    case 'code': {
      for (let i = 0; i < 4; i++) {
        k.box(0.9, 2.2, 1.3, '#26304F', { x: -2.6 + i * 1.1, y: at(-2.6 + i * 1.1, -1.5), z: -1.5 });
        k.windows(0.92, 2.2, 1.32, 5, '#6FE3FF', { x: -2.6 + i * 1.1, y: at(-2.6 + i * 1.1, -1.5), z: -1.5 });
      }
      // robot arm
      const bx = 2.2, bz = 1.5, by = at(bx, bz);
      k.cyl(0.6, 0.7, 0.4, '#F2B33D', { x: bx, y: by, z: bz });
      k.add(new THREE.BoxGeometry(0.35, 2, 0.35), '#F2B33D', { x: bx + 0.3, y: by + 1.3, z: bz, rz: -0.35 });
      k.add(new THREE.BoxGeometry(0.3, 1.6, 0.3), '#F2B33D', { x: bx + 1.15, y: by + 2.35, z: bz, rz: 0.9 });
      k.sphere(0.25, '#26304F', { x: bx + 0.65, y: by + 2.25, z: bz }, 0);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.06, 6, 60), new THREE.MeshBasicMaterial({ color: '#9C8FE0', transparent: true, opacity: 0.85 }));
      ring.position.set(-1, at(-1, 2.5) + 3.2, 2.5);
      const ring2 = ring.clone();
      ring2.scale.setScalar(0.7);
      island.group.add(ring, ring2);
      anim.push((t) => { ring.rotation.x = t * 0.6; ring.rotation.y = t * 0.4; ring2.rotation.y = -t * 0.8; ring2.rotation.z = t * 0.5; });
      break;
    }
    case 'maker': {
      // tower crane + building frame + gears
      const cx = -2.5, cz = -1.5, cy = at(cx, cz);
      k.box(0.35, 6, 0.35, '#F2B33D', { x: cx, y: cy, z: cz });
      k.box(5.5, 0.3, 0.3, '#F2B33D', { x: cx + 1.5, y: cy + 6, z: cz });
      k.box(0.8, 0.6, 0.8, '#5A5A66', { x: cx - 1, y: cy + 5.6, z: cz });
      k.box(0.05, 2.6, 0.05, '#5A5A66', { x: cx + 3.6, y: cy + 3.4, z: cz });
      k.box(0.9, 0.5, 0.9, '#4A8BD6', { x: cx + 3.6, y: cy + 2.9, z: cz });
      const fx = 1, fz = -2, fy = at(fx, fz);
      for (let f = 0; f < 4; f++) {
        k.box(3, 0.15, 3, '#C9CFD8', { x: fx, y: fy + f * 1.1, z: fz });
        if (f < 3) for (const [dx, dz] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) k.box(0.15, 1.1, 0.15, '#8E98A8', { x: fx + dx, y: fy + f * 1.1, z: fz + dz });
      }
      k.box(3, 1.1, 3, '#E7D7BE', { x: fx, y: fy, z: fz });
      const gear = new THREE.Group();
      const g1 = new Kit();
      g1.add(new THREE.CylinderGeometry(1.2, 1.2, 0.35, 16).rotateX(Math.PI / 2), '#A86A1E', {});
      for (let i = 0; i < 10; i++) g1.add(new THREE.BoxGeometry(0.35, 0.5, 0.35), '#A86A1E', { x: Math.cos((i / 10) * Math.PI * 2) * 1.3, y: Math.sin((i / 10) * Math.PI * 2) * 1.3, rz: (i / 10) * Math.PI * 2 });
      g1.add(new THREE.CylinderGeometry(0.4, 0.4, 0.45, 10).rotateX(Math.PI / 2), '#E8B26A', {});
      const gm = g1.build();
      gear.add(gm);
      gear.position.set(2.2, at(2.2, 3) + 2.2, 3);
      island.group.add(gear);
      anim.push((t) => { gm.rotation.z = t * 0.6; });
      break;
    }
    case 'health': {
      const hx = -1, hz = -1, hy = at(hx, hz);
      k.box(4.5, 3, 2.6, '#F7F7F4', { x: hx, y: hy, z: hz });
      k.windows(4.5, 3, 2.6, 4, '#BFD8EA', { x: hx, y: hy, z: hz });
      k.box(1.1, 0.35, 0.1, '#2E8A63', { x: hx, y: hy + 2.4, z: hz + 1.32 });
      k.box(0.35, 1.1, 0.1, '#2E8A63', { x: hx, y: hy + 2.05, z: hz + 1.32 });
      // garden
      for (let i = 0; i < 6; i++) k.sphere(0.35, ['#F29A8E', '#F2C46D', '#FFFFFF'][i % 3], { x: 1.5 + (i % 3) * 0.8, y: at(2, 3) + 0.3, z: 2.4 + Math.floor(i / 3) * 0.8 }, 0);
      const heart = new THREE.Group();
      const hs = new THREE.Shape();
      hs.moveTo(0, -0.9); hs.bezierCurveTo(-1.4, 0, -0.8, 1, 0, 0.45); hs.bezierCurveTo(0.8, 1, 1.4, 0, 0, -0.9);
      const hm = new THREE.Mesh(new THREE.ExtrudeGeometry(hs, { depth: 0.3, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2 }), new THREE.MeshLambertMaterial({ color: '#F27B7B', emissive: '#C23B3B', emissiveIntensity: 0.4 }));
      heart.add(hm);
      heart.position.set(hx, hy + 5, hz);
      island.group.add(heart);
      anim.push((t) => { heart.rotation.y = t * 0.8; const s = 1 + Math.max(0, Math.sin(t * 3)) * 0.12; heart.scale.setScalar(s); });
      break;
    }
    case 'leisure': {
      const hx = -2, hz = -1.5, hy = at(hx, hz);
      k.box(2.4, 4.6, 2, '#FBF3E4', { x: hx, y: hy, z: hz });
      k.windows(2.4, 4.6, 2, 6, '#F2A07B', { x: hx, y: hy, z: hz });
      k.box(2.6, 0.3, 2.2, '#C2552E', { x: hx, y: hy + 4.6, z: hz });
      // pool
      k.box(2.6, 0.12, 1.4, '#7FD0EA', { x: 1.8, y: at(1.8, -2), z: -2 });
      // chef hat restaurant
      const rx = 2.2, rz = 2, ry = at(rx, rz);
      k.cyl(1.1, 1.1, 1, '#FFFFFF', { x: rx, y: ry, z: rz }, 14);
      k.sphere(0.65, '#FFFFFF', { x: rx - 0.5, y: ry + 1.4, z: rz }, 1);
      k.sphere(0.75, '#FFFFFF', { x: rx + 0.2, y: ry + 1.6, z: rz }, 1);
      k.sphere(0.6, '#FFFFFF', { x: rx + 0.7, y: ry + 1.35, z: rz + 0.2 }, 1);
      // night-market stalls
      for (let i = 0; i < 3; i++) {
        const sx = -2.5 + i * 1.5, sz = 2.6;
        k.box(1.1, 0.8, 0.9, '#E8D7BE', { x: sx, y: at(sx, sz), z: sz });
        k.gable(1.3, 0.45, 1.05, ['#E2553F', '#F2B33D', '#3E9E86'][i], { x: sx, y: at(sx, sz) + 0.8, z: sz });
      }
      const lanterns = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const l = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#FF8A5B', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
        l.scale.setScalar(0.9);
        l.position.set(-3 + i * 1.1, at(-1, 2.6) + 1.8 + Math.sin(i) * 0.15, 2.6);
        lanterns.add(l);
      }
      island.group.add(lanterns);
      anim.push((t) => lanterns.children.forEach((l, i) => { l.material.opacity = 0.7 + 0.3 * Math.sin(t * 2 + i); }));
      for (let i = 0; i < 3; i++) k.tree('#5FA06A', { x: 3.8, y: at(3.8, -3 + i * 1.3), z: -3 + i * 1.3, s: 0.55 }, 'palm');
      break;
    }
    case 'story': {
      // film studio hangar + big screen + spotlights
      const sx = -1.5, sz = -1.5, syy = at(sx, sz);
      const hangar = new THREE.CylinderGeometry(1.8, 1.8, 4, 14, 1, false, 0, Math.PI);
      hangar.rotateZ(Math.PI / 2); hangar.rotateY(Math.PI / 2);
      k.add(hangar, '#EDE6F2', { x: sx, y: syy, z: sz });
      k.box(3.6, 0.12, 4.05, '#D9CEE4', { x: sx, y: syy, z: sz });
      k.box(3.4, 2, 0.15, '#26304F', { x: 2, y: at(2, 1.5) + 0.8, z: 1.5, ry: -0.5 });
      k.box(3.2, 1.8, 0.16, '#E59BC0', { x: 2.03, y: at(2, 1.5) + 0.9, z: 1.53, ry: -0.5 });
      k.box(0.12, 0.8, 0.12, '#26304F', { x: 1.2, y: at(1.2, 1.9), z: 1.9 });
      k.box(0.12, 0.8, 0.12, '#26304F', { x: 2.8, y: at(2.8, 1.1), z: 1.1 });
      // clapperboard
      k.box(1, 0.7, 0.12, '#26304F', { x: -2.8, y: at(-2.8, 2.6), z: 2.6, ry: 0.4 });
      k.box(1.05, 0.18, 0.13, '#FFFFFF', { x: -2.8, y: at(-2.8, 2.6) + 0.75, z: 2.6, ry: 0.4, rz: 0.15 });
      const beams = new THREE.Group();
      const bm = new THREE.MeshBasicMaterial({ color: '#FFE3F0', transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      for (let i = 0; i < 3; i++) {
        const b = new THREE.Mesh(new THREE.ConeGeometry(0.9, 9, 14, 1, true).translate(0, 4.5, 0), bm);
        b.position.set(-3 + i * 2.6, at(-3 + i * 2.6, -3.5), -3.5);
        beams.add(b);
      }
      island.group.add(beams);
      anim.push((t) => beams.children.forEach((b, i) => { b.rotation.z = Math.sin(t * 0.7 + i * 2) * 0.5; b.rotation.x = Math.cos(t * 0.5 + i) * 0.3; }));
      break;
    }
    case 'business': {
      const towers = [[-2.5, -1.5, 5.5], [-1, -2.6, 4.2], [0.6, -1.2, 6.5], [2.2, -2.4, 3.6]];
      for (const [x, z, h] of towers) {
        k.box(1.3, h, 1.3, '#BFD3E6', { x, y: at(x, z), z });
        k.windows(1.32, h, 1.32, Math.floor(h * 1.4), '#FFFFFF', { x, y: at(x, z), z });
        k.box(1.1, 0.25, 1.1, '#6E7E2C', { x, y: at(x, z) + h, z });
      }
      // trading-floor dome
      k.add(new THREE.SphereGeometry(1.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#E9EFD2', { x: 1, y: at(1, 2.6), z: 2.6 });
      k.cyl(1.55, 1.55, 0.4, '#B9C77A', { x: 1, y: at(1, 2.6) - 0.2, z: 2.6 }, 16);
      const planes = new THREE.Group();
      const pg = new THREE.BufferGeometry();
      pg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.6, -0.4, 0, -0.4, 0, 0.06, -0.2, 0, 0, 0.6, 0, 0.06, -0.2, 0.4, 0, -0.4], 3));
      pg.computeVertexNormals();
      const pm = new THREE.MeshLambertMaterial({ color: '#FFFFFF', side: THREE.DoubleSide });
      for (let i = 0; i < 4; i++) { const p = new THREE.Mesh(pg, pm); p.userData.phase = i * 1.6; planes.add(p); }
      planes.position.set(0, at(0, 0) + 7, 0);
      island.group.add(planes);
      anim.push((t) => planes.children.forEach((p) => {
        const a = t * 0.5 + p.userData.phase;
        p.position.set(Math.cos(a) * 5, Math.sin(a * 2) * 0.6, Math.sin(a) * 5);
        p.rotation.y = -a;
        p.rotation.z = Math.sin(a * 2) * 0.3;
      }));
      break;
    }
  }
}

// ---------- the archipelago ----------
export class Archipelago {
  constructor(center, quality) {
    this.center = center.clone();
    this.quality = quality;
    this.group = new THREE.Group();
    this.group.position.copy(center);
    this.islands = [];
    this.anim = [];
    this.pickables = [];
    this.bridges = new THREE.Group();
    this.bridges.position.copy(center).negate().add(center); // stays in group space
    this.group.add(this.bridges);
    this.bridgeMeshes = [];

    const n = ISLANDS.length;
    const ringR = 50;
    ISLANDS.forEach((def, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2 + 0.25;
      const pos = new THREE.Vector3(Math.cos(a) * ringR, (i % 2 ? 6 : -2) + Math.sin(i * 1.7) * 3, Math.sin(a) * ringR);
      this.islands.push(this.buildIsland(def, pos, i));
    });
    this.foundation = this.buildIsland({ id: 'ifp-stop', name: { zh: '華語先修島 · IFP', en: 'Mandarin foundation · IFP' }, color: '#8FD0B0', accent: '#3E9E86', programs: [] }, new THREE.Vector3(-8, -13, 8), 9);
    this.setLit(this.foundation, true, 0.01);
  }

  buildIsland(def, pos, index) {
    const q = this.quality;
    const radius = def.programs.length > 6 ? 11.5 : 9.5;
    const tint = new THREE.Color(def.color);
    const grass = new THREE.Color('#A8D08C').lerp(tint, 0.28).getStyle();
    const grass2 = new THREE.Color('#8FC27A').lerp(tint, 0.22).getStyle();
    const hillSeed = index * 3.3;
    const base = floatingBase({ radius, seed: 20 + index * 7, segments: 34, rings: 6, grass, grass2, depth: 9 + (index % 3) * 2,
      hill: (x, z) => 0.9 * Math.exp(-((x + Math.cos(hillSeed) * 3) ** 2 + (z + Math.sin(hillSeed) * 3) ** 2) / 18), lite: q.lite });
    const group = new THREE.Group();
    group.position.copy(pos);
    group.rotation.y = -Math.atan2(pos.z, pos.x) - Math.PI / 2; // face the center
    const island = { def, group, radius, sy: base.surfaceY, home: pos.clone(), lit: false, programAnchors: {}, buildingFlags: {}, programBuildings: {} };
    const mat = lambert({ color: DIM.clone() });
    const land = new THREE.Mesh(base.geometry, mat);
    land.receiveShadow = true;
    land.castShadow = true;
    land.userData.islandId = def.id;
    group.add(land);
    this.pickables.push(land);

    const k = new Kit();
    landmark(def.id, k, island, this.anim);

    // program pavilions around the rim
    const progs = def.programs;
    const rr = radius * 0.68;
    progs.forEach((p, j) => {
      const pk = new Kit();
      const a = Math.PI * 0.18 + (j / progs.length) * Math.PI * 1.64;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      const y = base.surfaceY(x, z) - 0.15;
      const w = 1.5, h = 1.2 + (p.lang === 'en' ? 0.3 : 0);
      pk.box(w, h, w, '#FBF6EE', { x, y, z, ry: -a });
      pk.box(w * 0.5, h * 0.55, 0.06, '#9FC3E2', { x: x + Math.cos(a) * 0.76, y: y + 0.1, z: z + Math.sin(a) * 0.76, ry: -a + Math.PI / 2 });
      pk.roof(w * 1.15, 0.7, w * 1.15, def.accent, { x, y: y + h, z, ry: -a });
      island.programAnchors[p.id] = new THREE.Vector3(x, y + h + 2.2, z);
      // flag pole + one pennant per bridge
      const poleX = x - Math.sin(a) * 0.95, poleZ = z + Math.cos(a) * 0.95;
      k.cyl(0.03, 0.03, 2.4, '#FFFFFF', { x: poleX, y, z: poleZ }, 5);
      p.bridges.forEach((b, bi) => {
        const fy = y + 2.25 - bi * 0.32;
        const fg = new THREE.BufferGeometry();
        fg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.55, -0.12, 0, 0, -0.26, 0], 3));
        k.add(fg, BRIDGES[b].color, { x: poleX, y: fy, z: poleZ, ry: -a });
      });
      const house = pk.build(lambert({ color: '#FFFFFF' }));
      house.userData = { islandId: def.id, programId: p.id };
      group.add(house);
      this.pickables.push(house);
      const lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#FFC53A', transparent: true, opacity: 0, depthWrite: false }));
      lamp.position.set(x, y + h + 1.1, z);
      lamp.scale.setScalar(2.2);
      group.add(lamp);
      island.programBuildings[p.id] = { house, lamp, originalColors: new Float32Array(house.geometry.attributes.color.array), ready: null };
    });

    // trees
    const r = rng(100 + index);
    for (let i = 0; i < (q.lite ? 10 : 20); i++) {
      const a = r() * Math.PI * 2, d = radius * (0.35 + r() * 0.55);
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.abs(d - rr) < 1.6) continue;
      k.tree(r() > 0.5 ? '#6DAF6B' : '#5E9E63', { x, y: base.surfaceY(x, z) - 0.12, z, s: 0.5 + r() * 0.5 }, r() > 0.7 ? 'pine' : 'round');
    }
    const props = k.build(lambert({ color: DIM.clone() }));
    props.userData.islandId = def.id;
    group.add(props);
    this.pickables.push(props);
    island.materials = [mat, props.material];

    // waterfall from the rim
    const wf = this.waterfall(def.color);
    const wa = Math.PI * 1.25;
    const wr = base.radiusAt(wa) - 0.25;
    wf.position.set(Math.cos(wa) * wr, base.surfaceY(Math.cos(wa) * wr, Math.sin(wa) * wr) - 0.2, Math.sin(wa) * wr);
    wf.rotation.y = -wa + Math.PI / 2;
    group.add(wf);
    island.waterfall = wf;

    // halo that appears when the island lights up
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: def.color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.scale.setScalar(radius * 4.2);
    halo.position.y = -2;
    group.add(halo);
    island.halo = halo;

    // beacon of light on top (shown when chosen as first stop)
    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 40, 8, 1, true).translate(0, 20, 0), new THREE.MeshBasicMaterial({ color: '#FFE3A3', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    group.add(beacon);
    island.beacon = beacon;

    island.anchor = new THREE.Vector3(0, 6.5, 0);
    island.anchorObj = new THREE.Object3D();
    island.anchorObj.position.copy(island.anchor);
    group.add(island.anchorObj);
    for (const [pid, v] of Object.entries(island.programAnchors)) {
      const o = new THREE.Object3D();
      o.position.copy(v);
      group.add(o);
      island.programAnchors[pid] = o;
    }
    island.phase = index * 1.3;
    this.group.add(group);
    return island;
  }

  waterfall(color) {
    const g = new THREE.Group();
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { time: { value: 0 }, tint: { value: new THREE.Color('#E8F6FF').lerp(new THREE.Color(color), 0.15) } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; vec3 p = position; p.z += pow(1.0-uv.y, 2.0) * 0.8; gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0); }`,
      fragmentShader: `uniform float time; uniform vec3 tint; varying vec2 vUv;
        void main(){ float s = fract(vUv.y*6.0 + time*1.6 + sin(vUv.x*14.0)*0.15); float streak = smoothstep(0.0,0.5,s)*smoothstep(1.0,0.6,s);
        float edge = smoothstep(0.0,0.25,vUv.x)*smoothstep(1.0,0.75,vUv.x); float fade = smoothstep(0.0,0.35,vUv.y);
        gl_FragColor = vec4(tint, (0.35+streak*0.5)*edge*fade); }`,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 10, 1, 12).translate(0, -5, 0), mat);
    g.add(plane);
    const mist = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#FFFFFF', transparent: true, opacity: 0.35, depthWrite: false }));
    mist.scale.setScalar(4);
    mist.position.y = -9.5;
    g.add(mist);
    g.userData.mat = mat;
    return g;
  }

  setLit(island, lit, duration = 1.2) {
    if (island.lit === lit) return Promise.resolve();
    island.lit = lit;
    const from = island.materials[0].color.clone();
    const to = lit ? LIT : DIM;
    const h0 = island.halo.material.opacity;
    return tween({ duration, onUpdate: (e) => {
      for (const m of island.materials) m.color.copy(from).lerp(to, e);
      island.halo.material.opacity = h0 + ((lit ? 0.22 : 0) - h0) * e;
    } });
  }

  lightAll(lit = true) {
    return Promise.all(this.islands.map((isl, i) => tween({ duration: 0.01, delay: i * 0.12 }).then(() => this.setLit(isl, lit))));
  }

  setBeacon(island, on) {
    for (const isl of this.islands) {
      const target = isl === island && on ? 0.5 : 0;
      const m = isl.beacon.material;
      const start = m.opacity;
      tween({ duration: 1, onUpdate: (e) => { m.opacity = start + (target - start) * e; } });
    }
  }

  clearAnchor() {
    this.anchoredChoice?.effect.dispose();this.anchoredChoice=null;
  }

  anchorChoice(island,programId) {
    this.clearAnchor();this.setBeacon(null,false);
    const target=island.programAnchors[programId];
    if(!target)return;
    const effect=createAnchorEffect(this.quality),p=target.position;
    effect.group.position.set(p.x,island.sy(p.x,p.z)+.12,p.z);
    island.group.add(effect.group);this.anchoredChoice={islandId:island.def.id,programId,effect};
    for(const other of this.islands)this.setLit(other,other===island,.8);
    const chosen=island.programBuildings[programId];if(chosen){chosen.house.material.emissive.set('#E8B342');chosen.house.material.emissiveIntensity=.65;chosen.lamp.material.opacity=1;}
    effect.update(0);
  }

  byId(id) { return this.islands.find((i) => i.def.id === id); }

  setPrograms(island, status, selected = null) {
    for (const p of island.def.programs) {
      const building = island.programBuildings[p.id];
      const { house, lamp } = building;
      const ready = status(p);
      if (building.ready !== ready) {
        const colors = house.geometry.attributes.color;
        colors.array.set(building.originalColors);
        if (ready===false) for (let i=0;i<colors.array.length;i+=3) { const gray=colors.array[i]*0.2126+colors.array[i+1]*0.7152+colors.array[i+2]*0.0722; colors.array[i]=colors.array[i+1]=colors.array[i+2]=gray; }
        colors.needsUpdate=true; building.ready=ready;
      }
      house.material.color.set(ready!==false ? '#FFFFFF' : '#81858A');
      house.material.emissive.set(p.id === selected ? (ready===null?'#49778E':ready ? '#D39A23' : '#353A40') : ready ? '#6C531B' : '#000000');
      house.material.emissiveIntensity = p.id === selected ? 0.5 : 0.2;
      lamp.material.opacity = ready ? (p.id === selected ? 1 : 0.7) : 0;
    }
  }

  worldPos(island, out = new THREE.Vector3()) { return island.group.getWorldPosition(out); }

  // ---------- bridges of light ----------
  clearBridges() {
    for (const m of this.bridgeMeshes) { this.group.remove(m); m.geometry.dispose(); m.material.dispose(); }
    this.bridgeMeshes = [];
  }

  showBridge(bridgeId, from, { dimOthers = true } = {}) {
    this.clearBridges();
    const color = new THREE.Color(BRIDGES[bridgeId].color);
    const reach = this.islands.filter((isl) => isl.def.programs.some((p) => p.bridges.includes(bridgeId)));
    const local = from.clone().sub(this.center);
    const stops = bridgeId === 'ifp' ? [this.foundation, ...reach] : reach;
    stops.forEach((isl, i) => {
      const start = bridgeId === 'ifp' && i > 0 ? this.foundation.group.position.clone() : local;
      const end = isl.group.position.clone().add(new THREE.Vector3(0, -1.2, 0));
      const mid = start.clone().lerp(end, 0.5);
      mid.y += 10;
      const curve = new THREE.CatmullRomCurve3([start, start.clone().lerp(mid, 0.5).setY(start.y + 6), mid, end]);
      const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false,
        uniforms: { time: { value: i * 0.3 }, color: { value: color }, grow: { value: 0 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `uniform float time; uniform vec3 color; uniform float grow; varying vec2 vUv;
          void main(){ if (vUv.x > grow) discard; float pulse = 0.5 + 0.5*sin((vUv.x*18.0 - time*3.0)); float core = 1.0 - abs(vUv.y-0.5)*2.0;
          float head = smoothstep(grow-0.04, grow, vUv.x) * step(grow, 0.999);
          gl_FragColor = vec4(mix(color, vec3(1.0), pulse*0.22 + head*0.6), (0.55 + pulse*0.35) * (0.7+core*0.3)); }`,
      });
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 90, 0.34, 6, false), mat);
      this.group.add(tube);
      this.bridgeMeshes.push(tube);
      tween({ duration: 1.6, delay: i * 0.15, onUpdate: (e) => { mat.uniforms.grow.value = e; } });
    });
    if (dimOthers) for (const isl of this.islands) this.setLit(isl, reach.includes(isl), 0.9);
    return reach;
  }

  clearConnections() {
    for(const mesh of this.connectionMeshes||[]){mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();}
    this.connectionMeshes=[];this.connectionPreview=null;
  }

  showProgramConnections(records,{filter='en',from=null}={}) {
    this.clearConnections();this.clearBridges();
    this.group.updateWorldMatrix(true,true);
    const color=BRIDGES[filter]?.color||'#4A8BD6';
    const foundationStart=this.foundation.group.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,3,0));
    const startWorld=filter==='ifp'?foundationStart:(from||this.center.clone().add(new THREE.Vector3(0,1,0)));
    const start=this.group.worldToLocal(startWorld.clone());
    for(const record of records){
      const island=this.byId(record.islandId),anchor=island?.programAnchors[record.programId];if(!anchor)continue;
      const end=this.group.worldToLocal(anchor.getWorldPosition(new THREE.Vector3()));end.y-=1;
      const mid=start.clone().lerp(end,.55);mid.y=Math.max(start.y,end.y)+10;
      const curve=new THREE.CatmullRomCurve3([start,start.clone().lerp(mid,.4),mid,end]);
      const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,55,.085,5,false),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,depthWrite:false}));
      mesh.name='connection-'+record.programId;mesh.userData={filter,programId:record.programId,islandId:record.islandId};
      this.group.add(mesh);this.connectionMeshes.push(mesh);
    }
    this.connectionPreview={filter,programIds:records.map(r=>r.programId),islandIds:[...new Set(records.map(r=>r.islandId))]};
    return this.connectionPreview;
  }

  // islands float up through the clouds, one after another
  rise(duration = 3.2) {
    this.group.visible = true;
    return Promise.all(this.islands.map((isl, i) => {
      isl.offset = -70;
      return tween({ duration, delay: i * 0.18, ease: easeOut, onUpdate: (e) => { isl.offset = -70 * (1 - e); } });
    }));
  }

  update(dt, t) {
    this.anchoredChoice?.effect.update(dt);
    for (const isl of [...this.islands, this.foundation]) {
      isl.group.position.y = isl.home.y + Math.sin(t * 0.5 + isl.phase) * 0.45 + (isl.offset ?? 0);
      isl.waterfall.userData.mat.uniforms.time.value = t;
    }
    for (const f of this.anim) f(t);
    for (const m of this.bridgeMeshes) m.material.uniforms.time.value += dt;
  }
}

