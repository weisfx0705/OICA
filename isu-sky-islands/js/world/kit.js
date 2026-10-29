import * as THREE from 'three';
import { mergeGeometries } from '../../vendor/BufferGeometryUtils.js';
import { paint, place } from '../util.js';

// A tiny modelling kit: every call pushes a painted, positioned geometry into a list,
// and build() merges them into one mesh (one draw call per diorama).
export class Kit {
  constructor() { this.parts = []; }
  add(geo, color, t) { this.parts.push(paint(place(geo, t), color)); return this; }
  box(w, h, d, color, t = {}) { return this.add(new THREE.BoxGeometry(w, h, d), color, { ...t, y: (t.y ?? 0) + h / 2 }); }
  cyl(rt, rb, h, color, t = {}, seg = 10) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), color, { ...t, y: (t.y ?? 0) + h / 2 }); }
  cone(r, h, color, t = {}, seg = 8) { return this.add(new THREE.ConeGeometry(r, h, seg), color, { ...t, y: (t.y ?? 0) + h / 2 }); }
  sphere(r, color, t = {}, detail = 1) { return this.add(new THREE.IcosahedronGeometry(r, detail), color, t); }
  roof(w, h, d, color, t = {}) {
    const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1);
    g.rotateY(Math.PI / 4);
    g.scale(w, h, d);
    return this.add(g, color, { ...t, y: (t.y ?? 0) + h / 2 });
  }
  gable(w, h, d, color, t = {}) {
    const s = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, h)]);
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
    g.translate(0, 0, -d / 2);
    return this.add(g, color, t);
  }
  tree(color, t = {}, kind = 'round') {
    const s = t.s ?? 1;
    this.cyl(0.08 * s, 0.11 * s, 0.5 * s, '#7B5A43', { x: t.x, y: t.y, z: t.z });
    if (kind === 'pine') this.cone(0.45 * s, 1.3 * s, color, { x: t.x, y: (t.y ?? 0) + 0.35 * s, z: t.z }, 6);
    else if (kind === 'palm') {
      this.cyl(0.06 * s, 0.09 * s, 1.4 * s, '#8A6A4A', { x: t.x, y: t.y, z: t.z }, 5);
      for (let i = 0; i < 5; i++) this.add(new THREE.ConeGeometry(0.16 * s, 0.9 * s, 4), color, { x: (t.x ?? 0) + Math.cos(i * 1.26) * 0.35 * s, y: (t.y ?? 0) + 1.35 * s, z: (t.z ?? 0) + Math.sin(i * 1.26) * 0.35 * s, rz: Math.cos(i * 1.26) * 1.3, rx: -Math.sin(i * 1.26) * 1.3 });
    } else this.sphere(0.5 * s, color, { x: t.x, y: (t.y ?? 0) + 0.75 * s, z: t.z, sy: 0.9 * s, sx: s, sz: s }, 0);
    return this;
  }
  windows(w, h, d, floors, color, t = {}) {
    // thin bands that read as rows of windows on a block
    for (let f = 0; f < floors; f++) {
      const y = (t.y ?? 0) + (h / (floors + 1)) * (f + 1);
      this.add(new THREE.BoxGeometry(w + 0.02, 0.07, d + 0.02), color, { x: t.x, y, z: t.z, ry: t.ry });
    }
    return this;
  }
  build(material) {
    const mesh = new THREE.Mesh(mergeGeometries(this.parts), material ?? new THREE.MeshLambertMaterial({ vertexColors: true }));
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
  }
}

export const lambert = (opts = {}) => new THREE.MeshLambertMaterial({ vertexColors: true, ...opts });
