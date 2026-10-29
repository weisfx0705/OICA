import * as THREE from 'three';

// Stylised water shared by the sea, the harbor and the rivers.
// A per-vertex `shore` value (0 open water → 1 at the coastline) drives colour depth and the foam line;
// `flow` > 0 turns the pattern into a current running along the mesh's uv.x (rivers).
export const waterTime = { value: 0 };
const SUN = new THREE.Vector3(0.62, 0.52, 0.58).normalize();

export function waterMaterial({ deep = '#2E7DB8', shallow = '#8ED7D8', foam = '#FFFFFF', flow = 0, scale = 1 } = {}) {
  const m = new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      deep: { value: new THREE.Color(deep) },
      shallow: { value: new THREE.Color(shallow) },
      foam: { value: new THREE.Color(foam) },
      flow: { value: flow },
      scale: { value: scale },
      sunDir: { value: SUN },
    }]),
    vertexShader: `
      attribute float shore;
      varying float vShore; varying vec3 vWorld; varying vec2 vUv;
      #include <fog_pars_vertex>
      void main() {
        vShore = shore; vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vec4 mvPosition = viewMatrix * w;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform float time; uniform vec3 deep; uniform vec3 shallow; uniform vec3 foam; uniform vec3 sunDir;
      uniform float flow; uniform float scale;
      varying float vShore; varying vec3 vWorld; varying vec2 vUv;
      #include <fog_pars_fragment>
      void main() {
        vec2 p = vWorld.xz * scale;
        if (flow > 0.0) p = vec2(vUv.x * 60.0 - time * flow * 2.6, vUv.y * 3.0);
        float w = sin(p.x * 0.9 + time * 0.9) * sin(p.y * 0.8 - time * 0.7)
                + 0.6 * sin((p.x + p.y) * 1.7 + time * 1.3)
                + 0.35 * sin((p.x - p.y) * 2.9 - time * 1.7);
        vec3 col = mix(deep, shallow, smoothstep(0.0, 1.0, vShore * 0.85 + 0.12));
        col += vec3(0.05) * smoothstep(0.6, 1.5, w);
        float glint = smoothstep(1.7, 1.95, w + 0.25 * sin(p.x * 4.1 + time * 1.7));
        col = mix(col, vec3(1.0), glint * 0.22);
        float band = smoothstep(0.8, 0.95, vShore) * (0.55 + 0.45 * sin(vShore * 30.0 - time * 2.2));
        col = mix(col, foam, clamp(band, 0.0, 1.0) * 0.7);
        vec3 V = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - clamp(V.y, 0.0, 1.0), 3.0);
        vec3 H = normalize(V + sunDir);
        col += vec3(1.0, 0.95, 0.85) * pow(max(H.y, 0.0), 220.0) * 0.6;
        col = mix(col, vec3(0.9, 0.94, 1.0), fres * 0.35);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  // UniformsUtils.merge clones uniforms, so the shared clock is attached afterwards
  m.uniforms.time = waterTime;
  m.side = THREE.DoubleSide;
  return m;
}

// Flat ribbon that follows a path (rivers). uv.x runs along the path so the current can flow.
export function ribbonGeometry(points, width, shore = 0.35) {
  const pos = [], uv = [], sh = [], idx = [];
  let total = 0;
  const lens = [0];
  for (let i = 1; i < points.length; i++) { total += points[i].distanceTo(points[i - 1]); lens.push(total); }
  for (let i = 0; i < points.length; i++) {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
    const dir = new THREE.Vector3().subVectors(b, a).setY(0).normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    const taper = Math.min(1, 0.35 + (i / (points.length - 1)) * 1.1);
    const w = width * taper * 0.5;
    const p = points[i];
    pos.push(p.x + side.x * w, p.y, p.z + side.z * w, p.x - side.x * w, p.y, p.z - side.z * w);
    const u = lens[i] / total;
    uv.push(u, 0, u, 1);
    sh.push(shore, shore);
    if (i) { const k = i * 2; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('shore', new THREE.Float32BufferAttribute(sh, 1));
  g.setIndex(idx);
  return g;
}
