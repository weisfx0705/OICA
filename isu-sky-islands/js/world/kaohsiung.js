import * as THREE from 'three';
import { transitRoute } from './transit.js';
import { floatingBase } from './base.js';
import { Kit, lambert } from './kit.js';
import { rng, glowTexture, noise2 } from '../util.js';
import { waterMaterial, ribbonGeometry } from './water.js';

const withShore = (geo, v) => { geo.setAttribute('shore', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count).fill(v), 1)); return geo; };

// Kaohsiung as a floating harbor city: port cranes, 85 Sky Tower, Pier-2 warehouses,
// Love River, the National Stadium, a chip fab and the circular light rail.
export function buildKaohsiung(quality) {
  const group = new THREE.Group();
  const R = 26;
  const base = floatingBase({ radius: R, seed: 4, segments: 44, rings: 8, hill: (x, z) => 0.25 * Math.exp(-((x - 10) ** 2 + (z - 12) ** 2) / 60) + 7.2 * Math.exp(-((x + 18) ** 2 / 24 + (z + 16) ** 2 / 42)), grass: '#B9D99B', grass2: '#A6CF8C', depth: 12, lite: quality.lite });
  const land = new THREE.Mesh(base.geometry, lambert());
  land.receiveShadow = true;
  group.add(land);
  const y0 = 0.12;

  // the city floats in a round sea with a porcelain plinth, matching the Taiwan diorama
  const SEA_R = 50, sc = new THREE.Vector3(-6, -0.45, 0);
  {
    const rings = quality.lite ? 22 : 36, segs = quality.lite ? 96 : 150;
    const sp = [], su = [], ss = [], si = [];
    for (let i = 0; i <= rings; i++) for (let j = 0; j < segs; j++) {
      const rad = (i / rings) ** 0.85 * SEA_R, a = (j / segs) * Math.PI * 2;
      const x = sc.x + Math.cos(a) * rad, z = sc.z + Math.sin(a) * rad;
      const ang = Math.atan2(z, x), d = Math.hypot(x, z) - base.radiusAt(ang);
      const cd = Math.hypot(x + 31, z - 6) - 5.2;
      sp.push(x, 0, z); su.push(i / rings, j / segs);
      ss.push(Math.max(0, 1 - Math.max(0, d) / 3.4, 1 - Math.max(0, cd) / 2.6));
    }
    for (let i = 0; i < rings; i++) for (let j = 0; j < segs; j++) {
      const a = i * segs + j, b = i * segs + (j + 1) % segs, c = (i + 1) * segs + j, d = (i + 1) * segs + (j + 1) % segs;
      si.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(su, 2));
    g.setAttribute('shore', new THREE.Float32BufferAttribute(ss, 1));
    g.setIndex(si);
    const sea = new THREE.Mesh(g, waterMaterial({ deep: '#2C76B3', shallow: '#86D0D7', scale: 0.4 }));
    sea.position.copy(sc); sea.name = 'kaohsiung-sea';
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(SEA_R, SEA_R - 1.4, 3.4, 140, 1, true), new THREE.MeshLambertMaterial({ color: '#F4EEE4', side: THREE.DoubleSide }));
    wall.position.set(sc.x, sc.y - 1.7, sc.z);
    const baseCap = new THREE.Mesh(new THREE.CircleGeometry(SEA_R - 1.4, 140), new THREE.MeshLambertMaterial({ color: '#E7DECF', side: THREE.DoubleSide }));
    baseCap.rotation.x = Math.PI / 2; baseCap.position.set(sc.x, sc.y - 3.4, sc.z);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(SEA_R, 0.16, 8, 180), new THREE.MeshLambertMaterial({ color: '#E5BE62', emissive: '#7A5A10', emissiveIntensity: 0.35 }));
    rim.rotation.x = Math.PI / 2; rim.position.set(sc.x, sc.y + 0.02, sc.z);
    group.add(sea, wall, baseCap, rim);
  }

  const k = new Kit();
  const r = rng(21);

  // harbor basin on the west side
  const basin = new THREE.Shape();
  basin.moveTo(-38,14);basin.bezierCurveTo(-30,19,-16,18,-11,12);basin.lineTo(-11,-15);basin.bezierCurveTo(-17,-22,-31,-23,-39,-15);basin.bezierCurveTo(-43,-4,-43,5,-38,14);
  const water = new THREE.Mesh(withShore(new THREE.ShapeGeometry(basin, 24).rotateX(-Math.PI / 2).translate(0, 0.32, 0), 0.32), waterMaterial({ deep: '#2C76B3', shallow: '#86D0D7', scale: 0.4 }));
  water.receiveShadow = true;water.name='continuous-harbour-sea';water.userData.surface='sea';
  group.add(water);
  // Chaishan rises on the city's western edge; Sizihwan lies at its coastal foot.
  const chaishan = new THREE.Group();chaishan.name='chaishan-landscape';
  const hills=new Kit();
  for(let i=0;i<24;i++){
    const angle=i*2.39996,rad=1.5+(i%5)*0.7;
    const x=-18+Math.cos(angle)*rad,z=-16+Math.sin(angle)*rad;
    hills.tree(i%2?'#4F8E60':'#6BAF6D',{x,y:base.surfaceY(x,z)-0.1,z,s:0.6+(i%3)*0.12},i%3?'round':'pine');
  }
  hills.add(new THREE.DodecahedronGeometry(1.5,0),'#BFC7AB',{x:-18,y:base.surfaceY(-18,-16)-0.5,z:-16,sx:1.2,sy:0.7,sz:0.8});
  chaishan.add(hills.build());group.add(chaishan);
  const bayShape=new THREE.Shape();bayShape.moveTo(-31,14);bayShape.bezierCurveTo(-21,16,-20,10,-22,5);bayShape.lineTo(-30,3);bayShape.quadraticCurveTo(-34,8,-31,14);
  const bay=new THREE.Mesh(withShore(new THREE.ShapeGeometry(bayShape,24).rotateX(-Math.PI/2),0.62),waterMaterial({ deep: '#2C76B3', shallow: '#86D0D7', scale: 0.4 }));
  bay.position.y=0.34;bay.name='sizihwan-bay';group.add(bay);
  const shorePoints=[];
  for(let i=0;i<=18;i++){
    const angle=Math.PI+0.12+i/18*0.36,rad=base.radiusAt(angle)*0.96;
    const x=Math.cos(angle)*rad,z=Math.sin(angle)*rad;shorePoints.push(new THREE.Vector3(x,base.surfaceY(x,z)+0.09,z));
  }
  const shore=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(shorePoints),45,0.32,6),new THREE.MeshLambertMaterial({color:'#EFD5A0'}));shore.name='sizihwan-shore';group.add(shore);

  // quay & cranes
  k.box(2.2, 0.35, 22, '#D9D2C5', { x: -12, y: y0, z: 0 });
  for (let i = 0; i < 4; i++) {
    const z = -8 + i * 5.2, x = -12.4;
    k.box(0.25, 3.4, 0.25, '#E2553F', { x: x - 0.5, y: y0 + 0.3, z: z - 0.7 });
    k.box(0.25, 3.4, 0.25, '#E2553F', { x: x - 0.5, y: y0 + 0.3, z: z + 0.7 });
    k.box(0.25, 3.4, 0.25, '#E2553F', { x: x + 0.5, y: y0 + 0.3, z: z - 0.7 });
    k.box(0.25, 3.4, 0.25, '#E2553F', { x: x + 0.5, y: y0 + 0.3, z: z + 0.7 });
    k.box(6.5, 0.35, 0.5, '#F2F0EA', { x: x - 1.8, y: y0 + 3.7, z });
    k.box(1.2, 0.8, 1.6, '#F2F0EA', { x, y: y0 + 3.4, z });
  }
  // container stacks
  const boxColors = ['#E2553F', '#2F6FA8', '#F2B33D', '#3E9E86', '#8A6CC4', '#F28B54'];
  for (let i = 0; i < 46; i++) {
    const cx = -9.8 + (i % 4) * 1.15, cz = -9 + Math.floor(i / 4) * 1.6;
    const stack = 1 + Math.floor(r() * 3);
    for (let s = 0; s < stack; s++) k.box(1.0, 0.5, 1.4, boxColors[Math.floor(r() * boxColors.length)], { x: cx, y: y0 + s * 0.52, z: cz });
  }
  // container ship
  k.box(9, 1.1, 2.4, '#2C3E66', { x: -19.5, y: y0 - 0.2, z: -4 });
  k.box(1.6, 1.6, 2.2, '#F2F0EA', { x: -15.6, y: y0 + 0.9, z: -4 });
  for (let i = 0; i < 6; i++) k.box(1.1, 0.6, 2, boxColors[i], { x: -22.5 + i * 1.15, y: y0 + 0.9, z: -4 });
  // ferry
  k.box(3.2, 0.7, 1.3, '#FFFFFF', { x: -20, y: y0 - 0.1, z: 6 });
  k.box(1.8, 0.6, 1.1, '#5FA8D3', { x: -20, y: y0 + 0.6, z: 6 });

  // Pier-2 warehouses (red brick, gabled)
  for (let i = 0; i < 5; i++) {
    const z = 13.5 - i * 0.2, x = -10 + i * 2.6;
    k.box(2.2, 1.0, 3.6, '#B5583F', { x, y: y0, z: z - 1 });
    k.gable(2.3, 0.7, 3.7, '#8E4532', { x, y: y0 + 1.0, z: z - 1 });
  }
  // 85 Sky Tower
  const tx = -3.5, tz = -7;
  k.box(1.5, 9, 1.8, '#5D6F95', { x: tx - 1.1, y: y0, z: tz });
  k.box(1.5, 9, 1.8, '#5D6F95', { x: tx + 1.1, y: y0, z: tz });
  k.box(3.7, 6.5, 1.9, '#6A7DA6', { x: tx, y: y0 + 9, z: tz });
  k.box(2.2, 2.4, 1.6, '#7A8DB6', { x: tx, y: y0 + 15.5, z: tz });
  k.cyl(0.06, 0.12, 2.6, '#DDE3F2', { x: tx, y: y0 + 17.9, z: tz }, 6);
  k.windows(1.52, 9, 1.82, 9, '#AFC3E8', { x: tx - 1.1, y: y0, z: tz });
  k.windows(1.52, 9, 1.82, 9, '#AFC3E8', { x: tx + 1.1, y: y0, z: tz });
  k.windows(3.72, 6.5, 1.92, 6, '#AFC3E8', { x: tx, y: y0 + 9, z: tz });

  // National Stadium (open C-shaped ring) + pitch
  const st = new THREE.TorusGeometry(4.2, 0.9, 6, 30, Math.PI * 1.65);
  st.rotateX(-Math.PI / 2);
  st.scale(1, 0.75, 1.15);
  k.add(st, '#E8E2D6', { x: 9, y: y0 + 0.6, z: -11, ry: 0.6 });
  k.add(new THREE.CylinderGeometry(3.3, 3.3, 0.15, 24).scale(1, 1, 1.15), '#7DBF6A', { x: 9, y: y0 + 0.1, z: -11 });
  k.add(new THREE.TorusGeometry(3.3, 0.18, 4, 30).rotateX(-Math.PI / 2).scale(1, 1, 1.15), '#D9634A', { x: 9, y: y0 + 0.18, z: -11 });

  // chip fab (clean white blocks + tanks)
  const fx = 13, fz = 8;
  k.box(9, 2.2, 4.6, '#F4F6F8', { x: fx, y: y0, z: fz });
  k.box(9.05, 0.25, 4.65, '#8FD3E8', { x: fx, y: y0 + 1.2, z: fz });
  k.box(4, 3.2, 3.2, '#EDF0F3', { x: fx - 1.5, y: y0, z: fz + 4.2 });
  for (let i = 0; i < 3; i++) k.cyl(0.7, 0.7, 2.2, '#D9DEE5', { x: fx + 2.4 + i * 1.6, y: y0, z: fz + 4.6 }, 12);
  k.cyl(0.25, 0.3, 4.2, '#C9CFD8', { x: fx + 4, y: y0 + 2.2, z: fz - 1.4 }, 8);

  // city fabric: blocks on a street grid; downtown rises around the 85 Sky Tower
  const pal = ['#FBF7F0', '#F4ECDF', '#EFE2CF', '#F3DCCB', '#E4ECF3', '#F6EBD9', '#E9E4F0'];
  const glassPal = ['#9EC9D9', '#B5D3E6', '#A9C2DE'];
  const riverZ = (x) => 2 + Math.sin(x * 0.25) * 2.5;
  const blocked = (x, z) =>
    Math.hypot(x, z) > R - 3.5 ||
    Math.abs(x - 2) < 1.3 || Math.abs(z + 1) < 1.3 ||
    (x > 3.5 && x < 15 && z > -17 && z < -5) ||
    (x > 7 && x < 19 && z > 4 && z < 15) ||
    (x > -7 && x < 0 && z > -10 && z < -4) ||
    (x < -6 && z > 8.5) ||
    Math.abs(z - riverZ(x)) < 2.1;
  const cell = 2.3;
  let placed = 0;
  for (let gx = -8.5; gx < 22; gx += cell) for (let gz = -21; gz < 21; gz += cell) {
    const x = gx + (r() - 0.5) * 0.35, z = gz + (r() - 0.5) * 0.35;
    if (blocked(x, z) || r() < 0.18) continue;
    if (placed > (quality.lite ? 60 : 110)) continue;
    const yb = base.surfaceY(x, z) - 0.05;
    if (r() < 0.1) { // pocket park
      k.box(1.8, 0.08, 1.8, '#A9D38E', { x, y: yb, z });
      k.tree('#5FA06A', { x: x - 0.4, y: yb, z: z - 0.3, s: 0.55 });
      k.tree('#6DAF6B', { x: x + 0.45, y: yb, z: z + 0.35, s: 0.5 });
      continue;
    }
    const down = Math.exp(-((x + 3) ** 2 + (z + 7) ** 2) / 160);
    const h = 0.7 + Math.pow(r(), 1.8) * (2.2 + down * 7.5);
    const w = 1.3 + r() * 0.5, d = 1.3 + r() * 0.5;
    const c = pal[Math.floor(r() * pal.length)];
    if (h > 3.2) {
      // podium + slimmer tower with a glass band and rooftop crown
      k.box(w + 0.25, 0.9, d + 0.25, c, { x, y: yb, z });
      const tw = w * 0.72, td = d * 0.72, glass = glassPal[Math.floor(r() * glassPal.length)];
      k.box(tw, h - 0.9, td, r() < 0.45 ? glass : c, { x, y: yb + 0.9, z });
      k.windows(tw, h - 0.9, td, Math.floor(h * 1.1), '#FFFFFF', { x, y: yb + 0.9, z });
      k.box(tw * 0.55, 0.35, td * 0.55, '#D8DDE6', { x, y: yb + h, z });
    } else {
      k.box(w, h, d, c, { x, y: yb, z });
      if (h > 1.4) k.windows(w, h, d, Math.floor(h * 1.4), '#D4DEEA', { x, y: yb, z });
      if (r() < 0.35) k.box(w * 0.7, 0.06, d * 0.7, '#9FCB86', { x, y: yb + h, z }); // roof garden
      else if (r() < 0.5) k.box(0.4, 0.3, 0.4, '#C9CED8', { x: x + w * 0.2, y: yb + h, z: z - d * 0.2 });
    }
    placed++;
  }
  // trees along the Love River
  for (let x = -10; x < 16; x += 1.6) {
    const zc = 2 + Math.sin(x * 0.25) * 2.5;
    k.tree('#6DAF6B', { x, y: y0, z: zc + 1.9, s: 0.7 });
    if (r() > 0.4) k.tree('#5E9E63', { x: x + 0.7, y: y0, z: zc - 1.9, s: 0.65 });
  }
  const city = k.build();
  group.add(city);

  // Love River: flowing water, arched bridges and a slow boat
  const riverPts = [];
  for (let x = -12; x <= 18; x += 0.75) riverPts.push(new THREE.Vector3(x, y0 + 0.16, riverZ(x)));
  const river = new THREE.Mesh(ribbonGeometry(riverPts, 2.6, 0.55), waterMaterial({ deep: '#3A8CC6', shallow: '#97D8E2', flow: 0.8 }));
  river.name = 'love-river';
  group.add(river);
  const bridgeKit = new Kit();
  for (const bx of [-4.5, 5.5, 12.5]) {
    const bz = riverZ(bx);
    const arch = new THREE.TorusGeometry(1.5, 0.16, 6, 16, Math.PI);
    bridgeKit.add(arch, '#F4EFE6', { x: bx, y: y0 + 0.05, z: bz, ry: Math.PI / 2 + Math.atan(Math.cos(bx * 0.25) * 0.625), sy: 0.55 });
    bridgeKit.box(0.9, 0.08, 3.4, '#E9E1D3', { x: bx, y: y0 + 0.8, z: bz, ry: Math.atan(Math.cos(bx * 0.25) * 0.625) });
  }
  group.add(bridgeKit.build());
  const boat = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.1, 3, 8).rotateZ(Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#FFFFFF' }));
  const roofB = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.5), new THREE.MeshLambertMaterial({ color: '#E2553F' }));
  roofB.position.y = 0.45;
  boat.add(hull, roofB);
  group.add(boat);

  // Circular light rail + tram
  const railCurve = new THREE.EllipseCurve(2, 0, 13, 11, 0, Math.PI * 2);
  const railPts = railCurve.getPoints(90).map((p) => new THREE.Vector3(p.x, y0 + 1.1, p.y));
  const railPath = new THREE.CatmullRomCurve3(railPts, true);
  const rail = new THREE.Mesh(new THREE.TubeGeometry(railPath, 120, 0.09, 5, true), new THREE.MeshLambertMaterial({ color: '#32875B', emissive: '#32875B', emissiveIntensity: 0.35 }));
  rail.name='route-light-rail';
  group.add(rail);
  const tram = new THREE.Group();
  const tramBody = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 0.6), new THREE.MeshLambertMaterial({ color: '#7FC56B', emissive: '#2E6E2A', emissiveIntensity: 0.3 }));
  tramBody.position.y = 0.32;
  tram.add(tramBody);
  group.add(tram);

  const point=(x,z,y=1.45)=>new THREE.Vector3(x,y,z);
  const red=transitRoute(group,{id:'red',points:[point(2,-22),point(2,-14),point(2,-7),point(2,-1),point(2,6),point(2,14),point(2,22)],color:'#CC3C47',speed:0.018,radius:0.12});
  const orange=transitRoute(group,{id:'orange',points:[point(-11,-1),point(-5,-1),point(2,-1),point(9,-1),point(16,-1),point(22,-1)],color:'#EF8D2E',speed:0.022,radius:0.12});
  // Cijin lies across the harbour; the dotted ferry line is a schematic crossing.
  const cijinBase=floatingBase({radius:5.5,seed:31,segments:22,rings:4,depth:5,grass:'#D7DFA2',grass2:'#BED196',lite:quality.lite});
  const cijin=new THREE.Group();cijin.position.set(-31,0.9,6);cijin.name='cijin-island';
  cijin.add(new THREE.Mesh(cijinBase.geometry,lambert()));
  const ck=new Kit();ck.box(3,1.4,1.5,'#B9634A',{x:0,y:0.25,z:0});ck.roof(3.3,0.55,1.7,'#8E4532',{x:0,y:1.65,z:0});ck.cyl(0.5,0.7,3.3,'#FFFFFF',{x:-2,y:0.3,z:-2},10);ck.cyl(0.65,0.65,0.5,'#36348E',{x:-2,y:3.6,z:-2},10);cijin.add(ck.build());group.add(cijin);
  const ferry=transitRoute(group,{id:'ferry',points:[point(-12,6,0.28),point(-19,7,0.28),point(-26,6,0.28)],color:'#148BB5',speed:0.025,radius:0.11,vehicle:'ferry'});
  const interchange=new THREE.Mesh(new THREE.TorusGeometry(0.65,0.15,5,20).rotateX(Math.PI/2),new THREE.MeshBasicMaterial({color:'#FFFFFF'}));interchange.position.set(2,1.65,-1);group.add(interchange);

  // concert lights over the stadium
  const beams = new THREE.Group();
  beams.position.set(9, y0 + 1, -11);
  const beamMat = new THREE.MeshBasicMaterial({ color: '#FFE3A3', transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Mesh(new THREE.ConeGeometry(1.4, 14, 16, 1, true), beamMat);
    b.geometry.translate(0, 7, 0);
    b.rotation.z = (i - 1.5) * 0.25;
    beams.add(b);
  }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#FFC53A', transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.setScalar(7);
  beams.add(glow);
  group.add(beams);

  const anchors = {
    port: new THREE.Vector3(-14, 6, -2),
    concert: new THREE.Vector3(9, 6.5, -11),
    chip: new THREE.Vector3(13, 5.5, 8),
    transit: new THREE.Vector3(2, 4, -1),
    cijin: new THREE.Vector3(-31, 6, 6),
    mountains: new THREE.Vector3(-18, base.surfaceY(-18,-16)+2, -16),
    sizihwan: new THREE.Vector3(-27, 2.5, -8),
    hamasen: new THREE.Vector3(-11, 3, -1),
  };

  let t = 0;
  const update = (dt) => {
    t += dt;
    red.update(t);orange.update(t);ferry.update(t);
    const bk = (Math.sin(t * 0.06) * 0.5 + 0.5), bxp = -9 + bk * 24;
    boat.position.set(bxp, y0 + 0.32, riverZ(bxp));
    boat.rotation.y = -Math.atan(Math.cos(bxp * 0.25) * 0.625) + (Math.cos(t * 0.06) < 0 ? Math.PI : 0);
    const k2 = (t * 0.035) % 1;
    const p = railPath.getPointAt(k2);
    const tan = railPath.getTangentAt(k2);
    tram.position.copy(p).setY(p.y - 0.25);
    tram.rotation.y = Math.atan2(-tan.z, tan.x);
    beams.children.forEach((b, i) => { if (b.isMesh) b.rotation.z = Math.sin(t * 0.8 + i * 1.7) * 0.45; });
    group.position.y = Math.sin(t * 0.5) * 0.3;
  };
  return { group, anchors, update, routes:{red,orange,ferry,lightRail:rail}, landscapes:{chaishan,sizihwan:bay,shore,harbor:water,cijin}, radius: R + 10 };
}
