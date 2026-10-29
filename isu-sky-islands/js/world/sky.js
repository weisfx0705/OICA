import * as THREE from 'three';
import { mergeGeometries } from '../../vendor/BufferGeometryUtils.js';
import { rng, tween } from '../util.js';

// Time-of-day moods. Colors are tuned for a soft, painterly late-afternoon sky.
const MOODS = {
  day: { top: '#5E8FD0', mid: '#A9CBEB', bottom: '#F6E3CF', fog: '#E9E1D6', sun: '#FFE6B8', hemiSky: '#D6E6FF', hemiGround: '#F6DCC0', sunI: 2.3, hemiI: 1.45 },
  golden: { top: '#4F79C2', mid: '#E6B8A6', bottom: '#F7CF9E', fog: '#F0D3B8', sun: '#FFC98A', hemiSky: '#DDDCF5', hemiGround: '#F6CDA6', sunI: 2.4, hemiI: 1.35 },
  dusk: { top: '#2B3F7A', mid: '#B784A7', bottom: '#F2A68A', fog: '#C99A9E', sun: '#FF9F7A', hemiSky: '#A9B0E0', hemiGround: '#F0AE92', sunI: 1.9, hemiI: 1.25 },
};

export class Sky {
  constructor(scene, quality) {
    this.scene = scene;
    this.quality = quality;
    this.uniforms = {
      top: { value: new THREE.Color() },
      mid: { value: new THREE.Color() },
      bottom: { value: new THREE.Color() },
      sunColor: { value: new THREE.Color() },
      sunDir: { value: new THREE.Vector3(0.62, 0.52, 0.58).normalize() },
    };
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1400, 32, 16),
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`,
        fragmentShader: `
          uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; uniform vec3 sunColor; uniform vec3 sunDir;
          varying vec3 vDir;
          void main(){
            float h = vDir.y;
            vec3 col = h > 0.0 ? mix(mid, top, pow(clamp(h,0.0,1.0), 0.65)) : mix(mid, bottom, pow(clamp(-h*2.2,0.0,1.0), 0.8));
            col = mix(col, bottom, smoothstep(0.18, -0.05, h) * 0.55);
            float s = max(dot(normalize(vDir), sunDir), 0.0);
            col += sunColor * (pow(s, 900.0) * 1.6 + pow(s, 24.0) * 0.28 + pow(s, 4.0) * 0.08);
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    );
    dome.renderOrder = -10;
    dome.frustumCulled = false;
    this.dome = dome;
    scene.add(dome);

    this.hemi = new THREE.HemisphereLight('#fff', '#fff', 1);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff', 2);
    this.sun.position.copy(this.uniforms.sunDir.value).multiplyScalar(120);
    if (quality.shadows) {
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.setScalar(quality.shadowSize);
      this.sun.shadow.bias = -0.0006;
      this.sun.shadow.normalBias = 0.03;
      this.sun.shadow.radius = 3;
    }
    scene.add(this.sun, this.sun.target);
    scene.fog = new THREE.Fog('#fff', 120, 700);

    this.mood = 'day';
    this.applyMood(MOODS.day);
    this.clouds = this.buildClouds();
  }

  applyMood(m) {
    this.uniforms.top.value.set(m.top);
    this.uniforms.mid.value.set(m.mid);
    this.uniforms.bottom.value.set(m.bottom);
    this.uniforms.sunColor.value.set(m.sun);
    this.scene.fog.color.set(m.fog);
    this.hemi.color.set(m.hemiSky);
    this.hemi.groundColor.set(m.hemiGround);
    this.hemi.intensity = m.hemiI;
    this.sun.color.set(m.sun);
    this.sun.intensity = m.sunI;
  }

  setMood(name, duration = 2.5) {
    if (name === this.mood) return;
    const from = MOODS[this.mood], to = MOODS[name];
    this.mood = name;
    const keys = ['top', 'mid', 'bottom', 'fog', 'sun', 'hemiSky', 'hemiGround'];
    const a = Object.fromEntries(keys.map((k) => [k, new THREE.Color(from[k])]));
    const b = Object.fromEntries(keys.map((k) => [k, new THREE.Color(to[k])]));
    const tmp = {};
    return tween({
      duration,
      onUpdate: (e) => {
        for (const k of keys) tmp[k] = a[k].clone().lerp(b[k], e).getStyle();
        tmp.sunI = from.sunI + (to.sunI - from.sunI) * e;
        tmp.hemiI = from.hemiI + (to.hemiI - from.hemiI) * e;
        this.applyMood(tmp);
      },
    });
  }

  // Move the shadow camera so it tightly covers whatever the player is looking at.
  fitShadow(center, radius) {
    const dir = this.uniforms.sunDir.value;
    this.sun.position.copy(center).addScaledVector(dir, radius * 3);
    this.sun.target.position.copy(center);
    const cam = this.sun.shadow.camera;
    cam.left = cam.bottom = -radius;
    cam.right = cam.top = radius;
    cam.near = radius * 0.5;
    cam.far = radius * 6;
    cam.updateProjectionMatrix();
  }

  buildClouds() {
    const r = rng(7);
    const variants = [];
    for (let v = 0; v < 3; v++) {
      const parts = [];
      const n = 5 + Math.floor(r() * 4);
      for (let i = 0; i < n; i++) {
        const s = 2.2 + r() * 2.6;
        const g = new THREE.IcosahedronGeometry(1, 2);
        g.scale(s * (1.1 + r() * 0.5), s * (0.7 + r() * 0.3), s);
        g.translate((i - n / 2) * 2.6 + r() * 1.5, r() * 1.6, (r() - 0.5) * 3);
        parts.push(g);
      }
      const geo = mergeGeometries(parts);
      // flatten the underside and add a cool shadow tone toward the bottom
      const pos = geo.attributes.position;
      const col = new Float32Array(pos.count * 3);
      const top = new THREE.Color('#ffffff'), low = new THREE.Color('#D7DEEA');
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i);
        if (y < -0.6) { y = -0.6 - (y + 0.6) * 0.15; pos.setY(i, y); }
        const c = low.clone().lerp(top, Math.min(1, Math.max(0, (y + 1) / 4)));
        col.set([c.r, c.g, c.b], i * 3);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      geo.computeVertexNormals();
      variants.push(geo);
    }
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#ffffff', emissiveIntensity: 0.18 });
    const count = this.quality.lite ? 14 : 26;
    const clouds = [];
    const dummy = new THREE.Object3D();
    variants.forEach((geo, vi) => {
      const per = Math.ceil(count / 3);
      const mesh = new THREE.InstancedMesh(geo, mat, per);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      const items = [];
      for (let i = 0; i < per; i++) {
        const ang = r() * Math.PI * 2;
        const rad = 60 + r() * 240;
        items.push({ ang, rad, y: -40 + r() * 80 + (r() < 0.35 ? -40 : 0), s: 0.8 + r() * 1.6, speed: 0.004 + r() * 0.01, rot: r() * Math.PI });
      }
      mesh.userData.items = items;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      clouds.push(mesh);
      this.updateCloudMesh(mesh, dummy, 0);
    });
    return clouds;
  }

  updateCloudMesh(mesh, dummy, time) {
    mesh.userData.items.forEach((c, i) => {
      const a = c.ang + time * c.speed;
      dummy.position.set(Math.cos(a) * c.rad + this.cloudCenter.x, c.y + this.cloudCenter.y, Math.sin(a) * c.rad + this.cloudCenter.z);
      dummy.rotation.set(0, c.rot, 0);
      dummy.scale.setScalar(c.s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }

  cloudCenter = new THREE.Vector3();

  update(time) {
    if (!this._dummy) this._dummy = new THREE.Object3D();
    // clouds move slowly; updating every frame is cheap (<30 instances)
    for (const m of this.clouds) this.updateCloudMesh(m, this._dummy, time);
  }
}
