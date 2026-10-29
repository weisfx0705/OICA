import * as THREE from 'three';
import { noise2, rng } from '../util.js';

// Low-poly floating island base: grassy top, a cliff band, and a layered hanging rock.
// Returns a vertex-colored, flat-shaded geometry plus helpers to place props on the surface.
export function floatingBase({
  radius = 10, seed = 1, rings = 7, segments = 36, hill = () => 0,
  grass = '#A8D08C', grass2 = '#93C47E', cliff = '#EBD3AC', rockA = '#D9B48C', rockB = '#C69D78', depth = 9, cliffH = 1.1,
  wobble = 0.16, lite = false,
} = {}) {
  const r = rng(seed);
  if (lite) { segments = Math.max(20, Math.round(segments * 0.7)); rings = Math.max(4, rings - 2); }
  const edge = [];
  for (let s = 0; s < segments; s++) {
    const a = (s / segments) * Math.PI * 2;
    const n = noise2(Math.cos(a) * 1.5 + seed, Math.sin(a) * 1.5 + seed, seed);
    edge.push(radius * (1 - wobble + n * wobble * 2));
  }
  const radiusAt = (ang) => {
    const f = ((ang / (Math.PI * 2)) % 1 + 1) % 1 * segments;
    const i = Math.floor(f), k = f - i;
    return edge[i % segments] * (1 - k) + edge[(i + 1) % segments] * k;
  };
  const topY = (x, z, rr) => hill(x, z) + (noise2(x * 0.3 + seed, z * 0.3, seed + 2) - 0.5) * 0.35 * rr;

  // vertex rings for the top
  const top = [];
  for (let i = 0; i <= rings; i++) {
    const row = [];
    const rr = i / rings;
    const cnt = i === 0 ? 1 : segments;
    for (let s = 0; s < cnt; s++) {
      const a = (s / segments) * Math.PI * 2 + (i % 2) * (Math.PI / segments) * 0.5;
      const jitter = i > 0 && i < rings ? (r() - 0.5) * 0.25 * (radius / rings) : 0;
      const rad = rr * radiusAt(a) + jitter;
      const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
      row.push(new THREE.Vector3(x, i === rings ? hill(x, z) * 0.6 : topY(x, z, rr), z));
    }
    top.push(row);
  }
  const pos = [], col = [];
  const cTmp = new THREE.Color();
  const g1 = new THREE.Color(grass), g2 = new THREE.Color(grass2);
  const tri = (a, b, c, color) => { pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); for (let k = 0; k < 3; k++) col.push(color.r, color.g, color.b); };
  const grassAt = (a, b, c) => {
    const n = noise2((a.x + b.x + c.x) * 0.12 + seed, (a.z + b.z + c.z) * 0.12, seed + 7);
    return cTmp.copy(g1).lerp(g2, n).clone();
  };
  // center fan
  for (let s = 0; s < segments; s++) {
    const a = top[0][0], b = top[1][s], c = top[1][(s + 1) % segments];
    tri(a, c, b, grassAt(a, b, c));
  }
  for (let i = 1; i < rings; i++) {
    for (let s = 0; s < segments; s++) {
      const a = top[i][s], b = top[i][(s + 1) % segments], c = top[i + 1][s], d = top[i + 1][(s + 1) % segments];
      tri(a, b, c, grassAt(a, b, c));
      tri(b, d, c, grassAt(b, d, c));
    }
  }
  // cliff band
  const rim = top[rings];
  const cTop = new THREE.Color(cliff), cLow = new THREE.Color(rockA);
  const low = rim.map((p) => new THREE.Vector3(p.x * 0.97, p.y - cliffH - r() * 0.4, p.z * 0.97));
  for (let s = 0; s < segments; s++) {
    const a = rim[s], b = rim[(s + 1) % segments], c = low[s], d = low[(s + 1) % segments];
    tri(a, b, c, cTop);
    tri(b, d, c, cLow);
  }
  // hanging rock: rings shrinking downward, alternating strata colors
  const rA = new THREE.Color(rockA), rB = new THREE.Color(rockB);
  let prev = low;
  const layers = lite ? 4 : 6;
  for (let l = 1; l <= layers; l++) {
    const k = l / layers;
    const shrink = Math.pow(1 - k, 0.9);
    const ring = [];
    for (let s = 0; s < segments; s++) {
      const p = low[s];
      const n = noise2(s * 0.45 + seed, l * 0.7, seed + 4);
      const sc = Math.max(0.04, shrink * (0.82 + n * 0.3));
      ring.push(new THREE.Vector3(p.x * sc, p.y - depth * Math.pow(k, 0.85) - n * depth * 0.18, p.z * sc));
    }
    const color = (l % 2 ? rA : rB).clone().lerp(new THREE.Color('#B7A6C9'), k * 0.35);
    for (let s = 0; s < segments; s++) {
      const a = prev[s], b = prev[(s + 1) % segments], c = ring[s], d = ring[(s + 1) % segments];
      tri(a, b, c, color);
      tri(b, d, c, color);
    }
    prev = ring;
  }
  const tip = new THREE.Vector3(0, prev[0].y - depth * 0.15, 0);
  for (let s = 0; s < segments; s++) tri(prev[s], prev[(s + 1) % segments], tip, rB.clone().lerp(new THREE.Color('#A99BC0'), 0.5));

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const surfaceY = (x, z) => topY(x, z, Math.min(1, Math.hypot(x, z) / radius));
  return { geometry: geo, radiusAt, surfaceY, radius };
}

// A few small rocks orbiting under an island for depth
export function hangingRocks(count, radius, seed, color = '#A9805F') {
  const r = rng(seed);
  const geos = [];
  for (let i = 0; i < count; i++) {
    const g = new THREE.DodecahedronGeometry(0.4 + r() * 0.9, 0);
    const a = r() * Math.PI * 2, d = radius * (0.7 + r() * 0.6);
    g.scale(1, 1.3 + r(), 1);
    g.translate(Math.cos(a) * d, -3 - r() * 6, Math.sin(a) * d);
    geos.push(g);
  }
  return { geos, color };
}
