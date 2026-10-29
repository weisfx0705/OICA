import * as THREE from 'three';
import { rng, tween } from '../util.js';

// Time-of-day moods. Colors are tuned for a soft, painterly late-afternoon sky.
const MOODS = {
  day: { top: '#3F74C9', mid: '#9DC3EE', bottom: '#F3E7DE', fog: '#E3E9F5', sun: '#FFF0D2', hemiSky: '#DCE8FF', hemiGround: '#F4E1CC', sunI: 2.35, hemiI: 1.4, shade: '#BFCBE6' },
  golden: { top: '#3C62B2', mid: '#E7C0B4', bottom: '#F7DDBD', fog: '#F1E2D8', sun: '#FFD39A', hemiSky: '#E2E0F6', hemiGround: '#F6D2AE', sunI: 2.4, hemiI: 1.32, shade: '#D3C2D6' },
  dusk: { top: '#24356C', mid: '#A87CA8', bottom: '#F0AE92', fog: '#D9BCC6', sun: '#FFA982', hemiSky: '#AEB4E2', hemiGround: '#F0B39A', sunI: 1.9, hemiI: 1.22, shade: '#A996BC' },
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
    this.applyMood(MOODS.day);
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
    if (this.cloudUniforms) { this.cloudUniforms.shade.value.set(m.shade); this.cloudUniforms.lit.value.set('#FFFFFF').lerp(new THREE.Color(m.sun), 0.25); }
  }

  setMood(name, duration = 2.5) {
    if (name === this.mood) return;
    const from = MOODS[this.mood], to = MOODS[name];
    this.mood = name;
    const keys = ['top', 'mid', 'bottom', 'fog', 'sun', 'hemiSky', 'hemiGround', 'shade'];
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

  // Painterly cloud sea: soft camera-facing sprites drawn from a procedural atlas.
  // One instanced draw call; a broad layer below the dioramas plus a few drifting banks.
  cloudAtlas() {
    const size = 256, c = document.createElement('canvas');
    c.width = c.height = size * 2;
    const g = c.getContext('2d');
    const r = rng(19);
    for (let v = 0; v < 4; v++) {
      const ox = (v % 2) * size, oy = Math.floor(v / 2) * size;
      g.save();
      g.beginPath(); g.rect(ox, oy, size, size); g.clip();
      const puffs = 9 + Math.floor(r() * 6);
      for (let i = 0; i < puffs; i++) {
        const t = i / (puffs - 1);
        const x = ox + size * (0.18 + 0.64 * t + (r() - 0.5) * 0.12);
        const base = oy + size * 0.66;
        const rad = size * (0.12 + Math.sin(t * Math.PI) * 0.16 + r() * 0.06);
        const y = base - rad * (0.35 + r() * 0.5);
        const grd = g.createRadialGradient(x, y, rad * 0.1, x, y, rad);
        grd.addColorStop(0, 'rgba(255,255,255,0.95)');
        grd.addColorStop(0.55, 'rgba(255,255,255,0.75)');
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grd;
        g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
      }
      // soft flat base
      const fade = g.createLinearGradient(0, oy + size * 0.55, 0, oy + size * 0.8);
      fade.addColorStop(0, 'rgba(255,255,255,0)');
      fade.addColorStop(1, 'rgba(255,255,255,1)');
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = fade;
      g.fillRect(ox, oy + size * 0.55, size, size * 0.45);
      g.globalCompositeOperation = 'source-over';
      g.restore();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    return tex;
  }

  buildClouds() {
    const r = rng(7);
    const lite = this.quality.lite;
    const seaCount = lite ? 46 : 86, bankCount = lite ? 7 : 12;
    const items = [];
    for (let i = 0; i < seaCount; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 300 + 20;
      items.push({ ang: a, rad: d, y: -28 + (r() - 0.5) * 7, size: 70 + r() * 70, speed: 0.0015 + r() * 0.002, v: Math.floor(r() * 4), alpha: 0.85, sea: 1 });
    }
    for (let i = 0; i < bankCount; i++) {
      const a = r() * Math.PI * 2, d = 140 + r() * 200;
      items.push({ ang: a, rad: d, y: -6 + r() * 46, size: 46 + r() * 50, speed: 0.004 + r() * 0.005, v: Math.floor(r() * 4), alpha: 0.75, sea: 0 });
    }
    this.cloudItems = items;
    const n = items.length;
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    this.cloudOffset = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    this.cloudOffset.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('offset', this.cloudOffset);
    geo.setAttribute('cdata', new THREE.InstancedBufferAttribute(new Float32Array(items.flatMap((c) => [c.size, c.v, c.alpha, c.sea])), 4));
    geo.instanceCount = n;
    this.cloudUniforms = {
      atlas: { value: this.cloudAtlas() },
      lit: { value: new THREE.Color('#FFFFFF') },
      shade: { value: new THREE.Color('#C9D2EA') },
      fogColor: { value: this.scene.fog.color },
      fogFar: { value: 900 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.cloudUniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: `
        attribute vec3 offset; attribute vec4 cdata;
        varying vec2 vUv; varying float vAlpha; varying float vDist; varying float vSea;
        void main(){
          vec4 mv = viewMatrix * vec4(offset, 1.0);
          float s = cdata.x;
          mv.xy += position.xy * vec2(s, s * 0.62);
          float v = cdata.y;
          vUv = (uv + vec2(mod(v, 2.0), floor(v / 2.0))) * 0.5;
          vDist = -mv.z;
          // fade sprites that come close to the camera so they never block the view
          vAlpha = cdata.z * smoothstep(s * 0.35, s * 1.1, vDist);
          vSea = cdata.w;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D atlas; uniform vec3 lit; uniform vec3 shade; uniform vec3 fogColor; uniform float fogFar;
        varying vec2 vUv; varying float vAlpha; varying float vDist; varying float vSea;
        void main(){
          vec4 t = texture2D(atlas, vUv);
          float local = fract(vUv.y * 2.0);
          vec3 col = mix(shade, lit, smoothstep(0.1, 0.75, local));
          col = mix(col, fogColor, clamp(vDist / fogFar, 0.0, 1.0) * (0.55 + vSea * 0.25));
          float a = t.a * vAlpha;
          if (a < 0.01) discard;
          gl_FragColor = vec4(col, a);
          #include <colorspace_fragment>
        }`,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 2;
    this.scene.add(mesh);
    this.cloudMesh = mesh;
    this.placeClouds(0);
    return [mesh];
  }

  placeClouds(time) {
    const arr = this.cloudOffset.array, c = this.cloudCenter;
    this.cloudItems.forEach((it, i) => {
      const a = it.ang + time * it.speed;
      arr[i * 3] = c.x + Math.cos(a) * it.rad;
      arr[i * 3 + 1] = c.y + it.y;
      arr[i * 3 + 2] = c.z + Math.sin(a) * it.rad;
    });
    this.cloudOffset.needsUpdate = true;
  }

  cloudCenter = new THREE.Vector3();

  update(time) {
    this.placeClouds(time);
  }
}
