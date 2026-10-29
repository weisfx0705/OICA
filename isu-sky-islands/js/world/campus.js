import * as THREE from 'three';
import { floatingBase } from './base.js';
import { Kit, lambert } from './kit.js';
import { rng, glowTexture } from '../util.js';

// I-Shou University on Guanyin Mountain: terracotta campus on the hillside, E-Da World
// with its Ferris wheel next door, and the medical campus floating beside E-Da Hospital.
const BRICK = '#B9634A', BRICK2 = '#A9553F', ROOF = '#C8673F', TRIM = '#F2E6D6', GLASS = '#9FC3E2';

export function buildCampus(quality) {
  const group = new THREE.Group();
  const R = 24;
  const hill = (x, z) => 7.5 * Math.exp(-((x + 2) ** 2 / 140 + (z + 12) ** 2 / 50)) + 2.2 * Math.exp(-((x - 10) ** 2 + (z + 8) ** 2) / 40);
  const base = floatingBase({ radius: R, seed: 9, segments: 44, rings: 9, hill, grass: '#A3CF86', grass2: '#86BD74', depth: 13, lite: quality.lite });
  const land = new THREE.Mesh(base.geometry, lambert());
  land.receiveShadow = true;
  group.add(land);
  const sy = (x, z) => base.surfaceY(x, z);

  const k = new Kit();
  const r = rng(33);
  const building = (x, z, w, h, d, floors, ry = 0) => {
    const y = sy(x, z) - 0.2;
    k.box(w, h, d, r() > 0.5 ? BRICK : BRICK2, { x, y, z, ry });
    k.windows(w, h, d, floors, TRIM, { x, y, z, ry });
    k.roof(w * 1.08, Math.min(1.4, w * 0.35), d * 1.08, ROOF, { x, y: y + h, z, ry });
  };

  // Relative building layout follows the official main-campus plan; distances are schematic.
  building(-12, -4, 5, 4.5, 3, 6);       // Science and Engineering
  building(-10, -10, 4.5, 6.2, 3, 8);   // International College
  building(-4, -11, 5.5, 5.6, 3, 7);    // Science and Technology
  building(7, -6, 8, 5.6, 3, 7);        // Comprehensive Teaching
  const ax = -3.5, az = -3.4;
  const ay = sy(ax, az) - 0.2;
  // Tall brick facade and blue central glazing, as in the supplied campus photographs.
  k.box(7.5, 8.4, 3, BRICK, { x: ax, y: ay, z: az });
  k.windows(7.5, 8.4, 3, 11, TRIM, { x: ax, y: ay, z: az });
  k.box(1.6, 8.1, 0.16, GLASS, { x: ax, y: ay + 0.15, z: az + 1.6 });
  k.box(7.9, 0.28, 3.3, TRIM, { x: ax, y: ay + 8.4, z: az });
  k.box(1.9, 0.4, 0.2, '#36348E', { x: ax, y: ay + 6.7, z: az + 1.72 });
  // dorm towers
  for (let i = 0; i < 3; i++) {
    const x = 10 + i * 3.0, z = 3 + i * 2.5;
    const y = sy(x, z) - 0.2;
    k.box(2.4, 6.5, 2.4, i === 1 ? BRICK2 : BRICK, { x, y, z });
    k.windows(2.4, 6.5, 2.4, 8, TRIM, { x, y, z });
    k.roof(2.7, 1, 2.7, ROOF, { x, y: y + 6.5, z });
  }
  // AI innovation center (glass)
  const lx = -11, lz = 3;
  const ly = sy(lx, lz) - 0.2;
  k.box(4, 2.2, 3, GLASS, { x: lx, y: ly, z: lz });
  k.box(4.2, 0.25, 3.2, TRIM, { x: lx, y: ly + 2.2, z: lz });
  // sports field
  const fx = 7, fz = -15;
  const fy = sy(fx, fz) + 0.05;
  k.add(new THREE.CylinderGeometry(4, 4, 0.12, 28).scale(1.5, 1, 1), '#C9583F', { x: fx, y: fy, z: fz });
  k.add(new THREE.CylinderGeometry(3.2, 3.2, 0.14, 28).scale(1.55, 1, 1), '#79B868', { x: fx, y: fy + 0.02, z: fz });
  // E-Da World: outlet mall + Greek-style theme park buildings
  const mx = -14, mz = 13;
  const my = sy(mx, mz) - 0.2;
  k.box(9, 2.2, 4, '#F3EFE7', { x: mx, y: my, z: mz });
  k.box(9.05, 0.5, 4.05, '#9FC3E2', { x: mx, y: my + 0.8, z: mz });
  for (let i = 0; i < 5; i++) {
    const x = -15 + i * 1.6 + r() * 0.4, z = 17.5 + r() * 1.5;
    const y = sy(x, z) - 0.2;
    k.box(1.2, 1 + r() * 0.8, 1.2, '#FFFFFF', { x, y, z });
    k.add(new THREE.SphereGeometry(0.55, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#3E78C4', { x, y: y + 1.6, z });
  }
  // Hotels are separate from the mall and the university teaching buildings.
  k.box(4, 5.5, 3, '#EEE6D6', { x: -18, y: sy(-18,4), z: 4 });
  k.windows(4, 5.5, 3, 7, '#B5C6DA', { x: -18, y: sy(-18,4), z: 4 });
  k.add(new THREE.SphereGeometry(1,12,6,0,Math.PI*2,0,Math.PI/2),'#D9C39C',{x:-18,y:sy(-18,4)+5.5,z:4});
  const walkPoints=[[-5,10],[-9,11],[-14,13]].map(([x,z])=>new THREE.Vector3(x,sy(x,z)+0.1,z));
  group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(walkPoints),30,0.2,5),new THREE.MeshLambertMaterial({color:'#EEE1C6'})));
  // An XR landmark marks the teaching and creation area, without claiming a separate building.
  k.box(1.3,0.8,1.3,'#A38ED2',{x:8,y:sy(8,-6)+5.7,z:-6});

  // trees, denser on the mountain
  for (let i = 0; i < (quality.lite ? 70 : 140); i++) {
    const a = r() * Math.PI * 2, d = r() * (R - 2.5);
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    const onHill = hill(x, z) > 2.5;
    if (!onHill && r() > 0.35) continue;
    if (Math.hypot(x - fx, (z - fz) * 1.4) < 7) continue;
    if (x > -17 && x < -7 && z > 10) continue;
    if (Math.abs(x + 3) < 6 && z > -12 && z < 6 && !onHill) continue;
    k.tree(onHill ? (r() > 0.5 ? '#4E8F5E' : '#5E9E63') : '#6DAF6B', { x, y: sy(x, z) - 0.15, z, s: 0.6 + r() * 0.6 }, onHill && r() > 0.5 ? 'pine' : 'round');
  }
  for (let i = 0; i < 6; i++) k.tree('#5FA06A', { x: -6 + i * 1.3, y: sy(-6 + i * 1.3, 7.5) - 0.1, z: 7.5, s: 0.55 }, 'palm');
  const mesh = k.build();
  group.add(mesh);

  // Ferris wheel (E-Da World) — animated
  const wheel = new THREE.Group();
  const wx = -17, wz = 8.5, wy = sy(wx, wz);
  wheel.position.set(wx, wy + 5.6, wz);
  wheel.rotation.y = 0.9;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.12, 6, 40), new THREE.MeshLambertMaterial({ color: '#F4F1EA' }));
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.6, 10).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#E2553F' }));
  const spokes = new Kit();
  for (let i = 0; i < 12; i++) spokes.add(new THREE.BoxGeometry(0.06, 4.6, 0.06), '#F4F1EA', { rz: (i / 12) * Math.PI * 2, x: Math.sin(-(i / 12) * Math.PI * 2) * 2.3, y: Math.cos((i / 12) * Math.PI * 2) * 2.3 });
  const spokeMesh = spokes.build();
  const spin = new THREE.Group();
  spin.add(rim, spokeMesh);
  const cabins = [];
  const cabinColors = ['#E2553F', '#F2B33D', '#3E9E86', '#4A8BD6', '#8A6CC4', '#F28B54'];
  for (let i = 0; i < 12; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.55), new THREE.MeshLambertMaterial({ color: cabinColors[i % 6] }));
    c.castShadow = true;
    spin.add(c);
    cabins.push(c);
  }
  wheel.add(spin, hub);
  const legs = new Kit();
  legs.add(new THREE.BoxGeometry(0.22, 6.2, 0.22), '#D8D2C6', { x: -1.4, y: -2.9, rz: -0.24 });
  legs.add(new THREE.BoxGeometry(0.22, 6.2, 0.22), '#D8D2C6', { x: 1.4, y: -2.9, rz: 0.24 });
  wheel.add(legs.build());
  group.add(wheel);

  // flag on the admin tower in brand gold
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55), new THREE.MeshLambertMaterial({ color: '#FFC53A', side: THREE.DoubleSide }));
  flag.position.set(ax + 0.45, ay + 7.4, az);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 5), new THREE.MeshLambertMaterial({ color: '#FFFFFF' }));
  pole.position.set(ax, ay + 7.1, az);
  group.add(flag, pole);

  // ---------- medical campus island ----------
  const med = new THREE.Group();
  med.position.set(38, -4, 10);
  const mbase = floatingBase({ radius: 10, seed: 14, segments: 30, rings: 5, hill: () => 0.2, grass: '#A9D38E', grass2: '#94C77E', depth: 8, lite: quality.lite });
  med.add(Object.assign(new THREE.Mesh(mbase.geometry, lambert()), { receiveShadow: true }));
  const mk = new Kit();
  // medical college tower (terracotta, like the real building)
  mk.box(4, 7.5, 2.6, BRICK, { x: -2.2, y: 0, z: -1.5 });
  mk.windows(4, 7.5, 2.6, 10, TRIM, { x: -2.2, y: 0, z: -1.5 });
  mk.box(2, 1.3, 1.6, BRICK2, { x: -2.2, y: 7.5, z: -1.5 });
  mk.roof(2.4, 1, 2, ROOF, { x: -2.2, y: 8.8, z: -1.5 });
  mk.roof(4.4, 1.2, 2.9, ROOF, { x: -2.2, y: 7.5, z: -1.5 });
  // E-Da Hospital (white) with a green cross
  mk.box(4.6, 4.6, 3, '#F7F7F4', { x: 3.6, y: 0, z: 1.5 });
  mk.windows(4.6, 4.6, 3, 6, '#BFD8EA', { x: 3.6, y: 0, z: 1.5 });
  mk.box(1.2, 0.35, 0.1, '#3E9E86', { x: 3.6, y: 4.0, z: 3.06 });
  mk.box(0.35, 1.2, 0.1, '#3E9E86', { x: 3.6, y: 3.6, z: 3.06 });
  for (let i = 0; i < 7; i++) mk.tree('#5FA06A', { x: -6 + i * 1.8, y: 0, z: 5.2 + (i % 2) * 0.8, s: 0.6 }, i % 2 ? 'palm' : 'round');
  med.add(mk.build());
  group.add(med);

  // a soft dotted sky-path between the two campuses
  const pathPts = [new THREE.Vector3(18, 1, 6), new THREE.Vector3(27, 3.5, 8), new THREE.Vector3(32, -2.5, 10)];
  const path = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pathPts), 40, 0.08, 5), new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.7 }));
  group.add(path);

  // glow over the AI center
  const aiGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#8FD3E8', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  aiGlow.scale.setScalar(6);
  aiGlow.position.set(lx, ly + 2.2, lz);
  group.add(aiGlow);

  const anchors = {
    main: new THREE.Vector3(ax, ay + 9.3, az),
    medical: new THREE.Vector3(38, 6.5, 8.5),
    labs: new THREE.Vector3(lx, ly + 4.2, lz),
    rank: new THREE.Vector3(9, sy(9, -1) + 9, -1),
    ferris: new THREE.Vector3(wx, wy + 11, wz),
    living: new THREE.Vector3(mx, my + 5.0, mz),
    metaverse: new THREE.Vector3(8, sy(8,-6)+7, -6),
    group: new THREE.Vector3(-21, sy(-18,4)+7, 1),
  };

  let t = 0;
  const update = (dt) => {
    t += dt;
    spin.rotation.z = t * 0.12;
    cabins.forEach((c, i) => {
      const a = (i / 12) * Math.PI * 2 + spin.rotation.z;
      c.position.set(Math.cos(a) * 4.6, Math.sin(a) * 4.6 - 0.4, 0);
      c.rotation.z = -spin.rotation.z;
    });
    flag.rotation.y = Math.sin(t * 2.2) * 0.25;
    med.position.y = -4 + Math.sin(t * 0.6 + 1) * 0.4;
    group.position.y = Math.sin(t * 0.45) * 0.2;
  };
  return { group, anchors, update, surfaceY:sy, buildings: { admin:anchors.main, engineering:new THREE.Vector3(-12,sy(-12,-4)+6,-4), technology:new THREE.Vector3(-4,sy(-4,-11)+7,-11), teaching:new THREE.Vector3(7,sy(7,-6)+7,-6), international:new THREE.Vector3(-10,sy(-10,-10)+8,-10), dorms:new THREE.Vector3(13,sy(13,5)+8,5), mall:anchors.living, hotels:new THREE.Vector3(-18,sy(-18,4)+7,4) }, radius: 34 };
}
