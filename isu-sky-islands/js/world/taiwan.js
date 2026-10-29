import * as THREE from 'three';
import { transitRoute } from './transit.js';
import { GEO } from '../geo-data.js';
import { noise2, rng, paint, place } from '../util.js';
import { mergeGeometries } from '../../vendor/BufferGeometryUtils.js';
import { waterMaterial, ribbonGeometry } from './water.js';

// Floating diorama of Taiwan built from the real coastline (Natural Earth 1:10m).
const K = 12; // world units per degree of latitude
const LAT0 = 23.7, LON0 = 120.95;
const COS0 = Math.cos((LAT0 * Math.PI) / 180);

export const twXZ = (lon, lat) => new THREE.Vector2((lon - LON0) * K * COS0, -(lat - LAT0) * K);

function distToSeg(p, a, b) {
  const abx = b.x - a.x, aby = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / (abx * abx + aby * aby || 1)));
  const dx = a.x + abx * t - p.x, dy = a.y + aby * t - p.y;
  return Math.hypot(dx, dy);
}
const distToLine = (p, pts) => { let d = Infinity; for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, distToSeg(p, pts[i], pts[i + 1])); return d; };

function inside(p, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

const SPINE = [[121.65, 24.85], [121.44, 24.4], [121.35, 24.0], [121.18, 23.55], [121.07, 23.1], [120.94, 22.6], [120.84, 22.2]].map(([lo, la]) => twXZ(lo, la));
const COASTAL = [[121.45, 23.7], [121.35, 23.25], [121.2, 22.85]].map(([lo, la]) => twXZ(lo, la));
const YUSHAN = twXZ(120.957, 23.47);
const XUESHAN = twXZ(121.231, 24.383);

export const TW_PLACES = {
  taipei: twXZ(121.56, 25.03),
  hsinchu: twXZ(120.97, 24.8),
  taichung: twXZ(120.68, 24.15),
  tainan: twXZ(120.2, 23.0),
  kaohsiung: twXZ(120.3, 22.63),
  yushan: YUSHAN,
};

export function buildTaiwan(quality) {
  const outline = GEO.taiwan.map(([lo, la]) => twXZ(lo, la));
  if (THREE.ShapeUtils.isClockWise(outline)) outline.reverse();
  const coastD = (p) => distToLine(p, [...outline, outline[0]]);

  const heightAt = (p, dCoast) => {
    const ds = distToLine(p, SPINE);
    let ridgeX = SPINE[SPINE.length - 1].x;
    for (let i=0;i<SPINE.length-1;i++) { const a=SPINE[i],b=SPINE[i+1]; if(p.y>=a.y && p.y<=b.y) { const k=(p.y-a.y)/(b.y-a.y); ridgeX=a.x+(b.x-a.x)*k; break; } }
    const width = p.x < ridgeX ? 2.4 : 3.1;
    let h = 6.2 * Math.exp(-((ds / width) ** 2));
    h += 1.6 * Math.exp(-((distToLine(p, COASTAL) / 1.2) ** 2));
    h += 2.8 * Math.exp(-((p.distanceTo(YUSHAN) / 1.5) ** 2));
    h += 1.8 * Math.exp(-((p.distanceTo(XUESHAN) / 1.4) ** 2));
    h += (noise2(p.x * 0.28, p.y * 0.28, 3) - 0.5) * 0.7 * Math.min(1, h / 2 + 0.2);
    const shore = Math.min(1, dCoast / 1.6);
    return 0.25 + Math.max(0, h) * shore + 0.15 * shore;
  };

  // Steiner points: jittered grid inside the island, kept away from the coast
  const r = rng(11);
  const step = quality.lite ? 1.05 : 0.68;
  const steiner = [];
  const box = new THREE.Box2().setFromPoints(outline);
  for (let x = box.min.x; x < box.max.x; x += step) {
    for (let y = box.min.y; y < box.max.y; y += step) {
      const p = new THREE.Vector2(x + (r() - 0.5) * step * 0.7, y + (r() - 0.5) * step * 0.7);
      if (inside(p, outline) && coastD(p) > step * 0.45) steiner.push(p);
    }
  }
  const faces = THREE.ShapeUtils.triangulateShape(outline, steiner.map((p) => [p]));
  const all = [...outline, ...steiner];
  const isCoast = (i) => i < outline.length;
  const dC = all.map((p, i) => (isCoast(i) ? 0 : coastD(p)));
  const hTop = all.map((p, i) => (isCoast(i) ? 0.22 : heightAt(p, dC[i])));
  const maxD = Math.max(...dC);

  // smooth elevation ramp: beach → plains → forest → alpine → summit
  const RAMP = [[0, '#EFE2BF'], [0.4, '#D9EAAA'], [1.2, '#BBDB8F'], [2.6, '#8EC47B'], [4.2, '#63A66C'], [5.8, '#7FA289'], [7.2, '#B9B8AE'], [8.6, '#F5F4EF']].map(([h, c]) => [h, new THREE.Color(c)]);
  const ramp = (h) => {
    for (let i = 1; i < RAMP.length; i++) if (h <= RAMP[i][0]) { const [h0, c0] = RAMP[i - 1], [h1, c1] = RAMP[i]; return c0.clone().lerp(c1, (h - h0) / (h1 - h0)); }
    return RAMP[RAMP.length - 1][1].clone();
  };
  const field = new THREE.Color('#E4EDB0');
  // indexed top surface → smooth normals and soft hill shading
  const pos = [], col = [], idx = [];
  all.forEach((p, i) => {
    const h = hTop[i];
    const c = ramp(h);
    if (h > 0.3 && h < 1.4) c.lerp(field, (noise2(p.x * 0.45, p.y * 0.45, 9) - 0.35) * 0.5);
    pos.push(p.x, h, p.y); col.push(c.r, c.g, c.b);
  });
  for (const [a, b, c] of faces) idx.push(a, c, b);
  // a thin sandy lip at the coast so the island reads cleanly against the water
  const lip = all.length;
  const sand = new THREE.Color('#E8D5A6');
  outline.forEach((p) => { pos.push(p.x, -0.35, p.y); col.push(sand.r, sand.g, sand.b); });
  for (let i = 0; i < outline.length; i++) { const j = (i + 1) % outline.length; idx.push(i, j, lip + i, j, lip + j, lip + i); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const land = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  land.castShadow = land.receiveShadow = true;

  // the island sits in a round sea, like a museum diorama floating above the clouds
  const SEA_R = 31;
  const seaGeo = new THREE.CircleGeometry(SEA_R, 120, 0, Math.PI * 2);
  {
    // subdivide radially so the shoreline foam can follow the coast
    const rings = quality.lite ? 26 : 44, segs = quality.lite ? 110 : 170;
    const sp = [], su = [], ss = [], si = [];
    const cx = 0, cz = 1.5;
    for (let r = 0; r <= rings; r++) for (let k = 0; k < segs; k++) {
      const rad = (r / rings) ** 0.8 * SEA_R, a = (k / segs) * Math.PI * 2;
      const x = cx + Math.cos(a) * rad, z = cz + Math.sin(a) * rad;
      const q = new THREE.Vector2(x, z);
      const inLand = inside(q, outline);
      const d = inLand ? 0 : coastD(q);
      sp.push(x, 0.02, z); su.push(r / rings, k / segs); ss.push(inLand ? 1 : Math.max(0, 1 - d / 3.2));
    }
    for (let r = 0; r < rings; r++) for (let k = 0; k < segs; k++) {
      const a = r * segs + k, b = r * segs + (k + 1) % segs, c = (r + 1) * segs + k, d = (r + 1) * segs + (k + 1) % segs;
      si.push(a, c, b, b, c, d);
    }
    seaGeo.dispose();
    var sea = new THREE.Mesh(new THREE.BufferGeometry(), waterMaterial({ deep: '#2F78B5', shallow: '#8AD5D6', scale: 0.42 }));
    sea.geometry.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    sea.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(su, 2));
    sea.geometry.setAttribute('shore', new THREE.Float32BufferAttribute(ss, 1));
    sea.geometry.setIndex(si);
    sea.position.x = 0;
    var seaCenter = new THREE.Vector3(cx, 0, cz);
  }
  sea.receiveShadow = true;
  // plinth: soft porcelain wall with a gold rim
  const plinth = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(SEA_R, SEA_R - 1.2, 3.2, 120, 1, true), new THREE.MeshLambertMaterial({ color: '#F4EEE4', side: THREE.DoubleSide }));
  wall.position.set(seaCenter.x, -1.58, seaCenter.z);
  const base = new THREE.Mesh(new THREE.CircleGeometry(SEA_R - 1.2, 120), new THREE.MeshLambertMaterial({ color: '#E7DECF', side: THREE.DoubleSide }));
  base.rotation.x = Math.PI / 2; base.position.set(seaCenter.x, -3.18, seaCenter.z);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(SEA_R, 0.14, 8, 160), new THREE.MeshLambertMaterial({ color: '#E5BE62', emissive: '#7A5A10', emissiveIntensity: 0.35 }));
  rim.rotation.x = Math.PI / 2; rim.position.set(seaCenter.x, 0.04, seaCenter.z);
  plinth.add(wall, base, rim);

  const group = new THREE.Group();
  group.add(land, sea, plinth);

  // height lookup for placing props
  const tris = faces.map(([a, b, c]) => [a, b, c]);
  const sampleH = (p) => {
    for (const [a, b, c] of tris) {
      const A = all[a], B = all[b], Cc = all[c];
      const d = (B.y - Cc.y) * (A.x - Cc.x) + (Cc.x - B.x) * (A.y - Cc.y);
      const w1 = ((B.y - Cc.y) * (p.x - Cc.x) + (Cc.x - B.x) * (p.y - Cc.y)) / d;
      const w2 = ((Cc.y - A.y) * (p.x - Cc.x) + (A.x - Cc.x) * (p.y - Cc.y)) / d;
      const w3 = 1 - w1 - w2;
      if (w1 >= -0.001 && w2 >= -0.001 && w3 >= -0.001) return w1 * hTop[a] + w2 * hTop[b] + w3 * hTop[c];
    }
    return 0.3;
  };

  // rivers: Tamsui, Lanyang, Dajia, Zhuoshui, Gaoping
  const RIVERS = [
    [[121.43, 24.86], [121.5, 24.98], [121.47, 25.08], [121.41, 25.17]],
    [[121.47, 24.58], [121.62, 24.66], [121.73, 24.72], [121.84, 24.73]],
    [[121.2, 24.28], [121.0, 24.29], [120.8, 24.33], [120.57, 24.38]],
    [[121.08, 23.72], [120.92, 23.79], [120.68, 23.84], [120.42, 23.85], [120.24, 23.84]],
    [[120.78, 23.08], [120.66, 22.9], [120.56, 22.72], [120.47, 22.55], [120.42, 22.47]],
  ];
  const riverMat = waterMaterial({ deep: '#3E8FC9', shallow: '#9ADBE6', flow: 1 });
  for (const path of RIVERS) {
    const pts = [];
    for (let i = 0; i < path.length - 1; i++) for (let j = 0; j < 8; j++) {
      const k = j / 8, lo = path[i][0] + (path[i + 1][0] - path[i][0]) * k, la = path[i][1] + (path[i + 1][1] - path[i][1]) * k;
      const q = twXZ(lo, la); pts.push(new THREE.Vector3(q.x, sampleH(q) + 0.07, q.y));
    }
    const endQ = twXZ(...path[path.length - 1]); pts.push(new THREE.Vector3(endQ.x, 0.08, endQ.y));
    const river = new THREE.Mesh(ribbonGeometry(pts, 0.6), riverMat);
    river.receiveShadow = true;
    group.add(river);
  }

  // trees on hills
  const treeGeo = mergeGeometries([
    paint(place(new THREE.ConeGeometry(0.3, 0.85, 7), { y: 0.62 }), '#4E9566'),
    paint(place(new THREE.CylinderGeometry(0.06, 0.08, 0.3, 5), { y: 0.15 }), '#7B5A43'),
  ]);
  const treeCount = quality.lite ? 80 : 150;
  const trees = new THREE.InstancedMesh(treeGeo, new THREE.MeshLambertMaterial({ vertexColors: true }), treeCount);
  const dummy = new THREE.Object3D();
  let n = 0, guard = 0;
  while (n < treeCount && guard++ < 8000) {
    const p = new THREE.Vector2(box.min.x + r() * (box.max.x - box.min.x), box.min.y + r() * (box.max.y - box.min.y));
    if (!inside(p, outline) || coastD(p) < 1) continue;
    const h = sampleH(p);
    if (h < 1.6 || h > 6.6) continue;
    dummy.position.set(p.x, h - 0.05, p.y);
    dummy.scale.setScalar(0.7 + r() * 0.7);
    dummy.rotation.y = r() * 6;
    dummy.updateMatrix();
    trees.setMatrixAt(n++, dummy.matrix);
  }
  trees.count = n;
  trees.castShadow = true;
  group.add(trees);

  // little cities
  const cityParts = [];
  const city = (p, count, spread) => {
    for (let i = 0; i < count; i++) {
      const q = new THREE.Vector2(p.x + (r() - 0.5) * spread, p.y + (r() - 0.5) * spread);
      if (!inside(q, outline)) continue;
      const h = 0.3 + r() * (count > 10 ? 1.4 : 0.8);
      const base = sampleH(q);
      cityParts.push(paint(place(new THREE.BoxGeometry(0.3, h, 0.3), { x: q.x, y: base + h / 2, z: q.y }), ['#FFFFFF', '#F6EEE3', '#F3E1D3', '#E3ECF5', '#F7E9C9'][Math.floor(r() * 5)]));
    }
  };
  city(TW_PLACES.taipei, 22, 1.8);
  // Taipei 101
  cityParts.push(paint(place(new THREE.CylinderGeometry(0.08, 0.2, 3.2, 4), { x: TW_PLACES.taipei.x + 0.3, y: sampleH(TW_PLACES.taipei) + 1.6, z: TW_PLACES.taipei.y }), '#BFE3DA'));
  city(TW_PLACES.taichung, 14, 1.6);
  city(TW_PLACES.tainan, 10, 1.4);
  city(TW_PLACES.kaohsiung, 18, 1.6);
  city(TW_PLACES.hsinchu, 8, 1.1);
  const cities = new THREE.Mesh(mergeGeometries(cityParts), new THREE.MeshLambertMaterial({ vertexColors: true }));
  cities.castShadow = cities.receiveShadow = true;
  group.add(cities);

  // Full western HSR corridor: Nangang/Taipei to Zuoying, sampled against the terrain.
  const hsrStations = [
    ['nangang',121.607,25.053],['taipei',121.517,25.048],['banqiao',121.464,25.014],
    ['taoyuan',121.215,25.013],['hsinchu',121.040,24.808],['miaoli',120.825,24.606],
    ['taichung',120.615,24.112],['changhua',120.575,23.874],['yunlin',120.417,23.737],
    ['chiayi',120.323,23.459],['tainan',120.286,22.925],['zuoying',120.308,22.687],
  ];
  const hsrPoints=[];
  for(let i=0;i<hsrStations.length-1;i++) {
    const a=hsrStations[i],b=hsrStations[i+1];
    for(let j=0;j<20;j++){const k=j/20;const p=twXZ(a[1]+(b[1]-a[1])*k,a[2]+(b[2]-a[2])*k);hsrPoints.push(new THREE.Vector3(p.x,sampleH(p)+0.45,p.y));}
  }
  const last=hsrStations[hsrStations.length-1],end=twXZ(last[1],last[2]);hsrPoints.push(new THREE.Vector3(end.x,sampleH(end)+0.45,end.y));
  const hsr=transitRoute(group,{id:'hsr',points:hsrPoints,color:'#E66A21',radius:0.14,speed:0.018,stops:hsrStations.map(([,lon,lat])=>{const p=twXZ(lon,lat);return new THREE.Vector3(p.x,sampleH(p)+0.45,p.y);}),segments:460,surfaceHeight:(x,z)=>sampleH(new THREE.Vector2(x,z))+0.55});

  const traCoords = [[121.52,25.04],[121.75,25.12],[121.86,24.6],[121.6,23.99],[121.4,23.35],[121.14,22.76],[120.98,22.61],[120.73,22.36],[120.54,22.36],[120.49,22.55],[120.35,22.65],[120.23,23.0],[120.32,23.47],[120.54,24.05],[120.72,24.28],[120.94,24.8],[121.25,24.95]];
  const traPoints = [];
  for(let i=0;i<traCoords.length;i++) {
    const from=traCoords[i],to=traCoords[(i+1)%traCoords.length];
    for(let j=0;j<4;j++){const k=j/4;const p=twXZ(from[0]+(to[0]-from[0])*k,from[1]+(to[1]-from[1])*k);traPoints.push(new THREE.Vector3(p.x,sampleH(p)+0.35,p.y));}
  }
  const tra = transitRoute(group,{id:'tra',points:traPoints,color:'#236AA7',closed:true,speed:0.018,radius:0.08});

  // Tropic of Cancer as a dashed golden line across the island
  const tropicA = twXZ(119.95, 23.44), tropicB = twXZ(121.75, 23.44);
  const tropicGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(tropicA.x, 7.6, tropicA.y), new THREE.Vector3(tropicB.x, 7.6, tropicB.y)].map((v, i) => v.setY(i ? 1.2 : 1.2)));
  const tropic = new THREE.Line(tropicGeo, new THREE.LineDashedMaterial({ color: '#FFC53A', dashSize: 0.6, gapSize: 0.4 }));
  tropic.computeLineDistances();
  group.add(tropic);

  // Kaohsiung beacon
  const khh = TW_PLACES.kaohsiung;
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 6, 6), new THREE.MeshBasicMaterial({ color: '#FFC53A', transparent: true, opacity: 0.7 }));
  beacon.position.set(khh.x, sampleH(khh) + 3, khh.y);
  group.add(beacon);

  const anchors = {
    tech: new THREE.Vector3(TW_PLACES.hsinchu.x, 6.5, TW_PLACES.hsinchu.y),
    safe: new THREE.Vector3(TW_PLACES.taipei.x, 5.5, TW_PLACES.taipei.y),
    food: new THREE.Vector3(TW_PLACES.tainan.x - 2, 5, TW_PLACES.tainan.y),
    breakfast: new THREE.Vector3(TW_PLACES.taipei.x + 3, 3, TW_PLACES.taipei.y + 1),
    travel: new THREE.Vector3(TW_PLACES.taichung.x + 5, 7, TW_PLACES.taichung.y + 4),
    free: new THREE.Vector3(TW_PLACES.taichung.x - 1, 6, TW_PLACES.taichung.y),
    yushan: new THREE.Vector3(YUSHAN.x, sampleH(YUSHAN) + 1.2, YUSHAN.y),
    kaohsiung: new THREE.Vector3(khh.x, sampleH(khh) + 6.3, khh.y),
    hsrTaipei: new THREE.Vector3(hsrPoints[20].x, hsrPoints[20].y + 1.5, hsrPoints[20].z),
    hsrZuoying: new THREE.Vector3(end.x, sampleH(end)+1.8, end.y),
    tropic: new THREE.Vector3(tropicB.x, 1.4, tropicB.y),
  };

  let t = 0;
  const update = (dt) => {
    t += dt;
    tra.update(t);
    hsr.update(t);
    beacon.material.opacity = 0.45 + 0.35 * Math.sin(t * 3);
    group.position.y = Math.sin(t * 0.5) * 0.25;
  };

  return { group, anchors, update, routes: { hsr, tra }, hsrStations, surfaceY: sampleH, mountainSpine:SPINE, land, radius: 24 };
}
