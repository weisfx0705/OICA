import * as THREE from 'three';
import { buildAircraft } from './aircraft.js';
import { GEO } from '../geo-data.js';
import { latLonToVec3, vec3ToLatLon, tween, easeInOut, glowTexture, clamp } from '../util.js';
import { KAOHSIUNG } from '../content.js';

const R = 10;

function landTest() {
  const { width, height, bits } = GEO.landMask;
  const bytes = Uint8Array.from(atob(bits), (c) => c.charCodeAt(0));
  return (lat, lon) => {
    const x = Math.min(width - 1, Math.floor(lon + 180));
    const y = Math.min(height - 1, Math.floor(90 - lat));
    const i = y * width + x;
    return (bytes[i >> 3] >> (7 - (i & 7))) & 1;
  };
}

export class Globe {
  constructor(quality) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0E1238');
    this.group = new THREE.Group();
    this.group.rotation.order = 'XYZ';
    this.scene.add(this.group);
    this.quality = quality;
    this.autoSpin = true;
    this.vel = { x: 0, y: 0 };
    this.time = 0;

    // lights for anything solid placed on the globe (the traveler)
    this.scene.add(new THREE.HemisphereLight('#E8ECFF', '#4A4F8A', 1.6));
    const key = new THREE.DirectionalLight('#FFF1DC', 2.2);
    key.position.set(10, 14, 30);
    this.scene.add(key);
    this.buildOcean();
    this.buildDots();
    this.buildAtmosphere();
    this.buildStars();
    this.buildTaiwanMarker();
    this.aircraft = buildAircraft();
    this.group.add(this.aircraft);
    this.home = null;
    this.arc = null;
    this.faceLatLon(18, 112, 0);
  }

  buildOcean() {
    const mat = new THREE.ShaderMaterial({
      uniforms: { deep: { value: new THREE.Color('#1A2160') }, rim: { value: new THREE.Color('#5470D6') } },
      vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform vec3 deep; uniform vec3 rim; varying vec3 vN; varying vec3 vV;
        void main(){ float f = pow(1.0 - max(dot(vN, vV), 0.0), 2.2); vec3 c = mix(deep, rim, f*0.85); gl_FragColor = vec4(c,1.0);
        #include <colorspace_fragment>
        }`,
    });
    this.ocean = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 48), mat);
    this.group.add(this.ocean);
  }

  buildDots() {
    const isLand = landTest();
    const N = this.quality.lite ? 26000 : 52000;
    const pos = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    const v = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const rad = Math.sqrt(1 - y * y);
      const th = golden * i;
      v.set(Math.cos(th) * rad, y, Math.sin(th) * rad);
      const { lat, lon } = vec3ToLatLon(v);
      if (!isLand(lat, lon)) continue;
      v.multiplyScalar(R * 1.002);
      pos.push(v.x, v.y, v.z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { color: { value: new THREE.Color('#CDD4FB') }, size: { value: (this.quality.lite ? 1.6 : 1.25) * Math.min(window.devicePixelRatio, 2) } },
      vertexShader: `uniform float size; varying float vF;
        void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vec3 n = normalize(normalMatrix*normalize(position)); vF = clamp(dot(n, normalize(-mv.xyz))*1.6, 0.0, 1.0);
        gl_PointSize = size * (60.0 / -mv.z); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform vec3 color; varying float vF;
        void main(){ vec2 c = gl_PointCoord-0.5; float d = length(c); if(d>0.5) discard; float a = smoothstep(0.5,0.3,d)*vF; gl_FragColor = vec4(color, a*0.95); }`,
    });
    this.dots = new THREE.Points(geo, mat);
    this.group.add(this.dots);
  }

  buildAtmosphere() {
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { color: { value: new THREE.Color('#7FA6FF') } },
      vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform vec3 color; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(clamp(1.05 + dot(vN, vV), 0.0, 1.0), 3.0); gl_FragColor = vec4(color, f*0.9); }`,
    });
    this.atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.18, 48, 32), mat);
    this.scene.add(this.atmo);
  }

  buildStars() {
    const n = this.quality.lite ? 500 : 1200;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(180 + Math.random() * 120);
      pos.set([v.x, v.y, v.z], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#E8ECFF', size: 0.9, sizeAttenuation: true, transparent: true, opacity: 0.75, depthWrite: false }));
    this.scene.add(stars);
  }

  buildTaiwanMarker() {
    const p = latLonToVec3(KAOHSIUNG.lat + 1.1, 120.95, R * 1.01);
    this.taiwanPos = p;
    const g = new THREE.Group();
    g.position.copy(p);
    g.lookAt(p.clone().multiplyScalar(2));
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.3, 40), new THREE.MeshBasicMaterial({ color: '#FFC53A', transparent: true, side: THREE.DoubleSide }));
    const core = new THREE.Mesh(new THREE.CircleGeometry(0.13, 24), new THREE.MeshBasicMaterial({ color: '#FFC53A' }));
    core.position.z = 0.01;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#FFC53A', transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.setScalar(1.6);
    g.add(ring, core, glow);
    this.twRing = ring;
    this.taiwanMarker = g;
    this.group.add(g);
  }

  setHome(lat, lon) {
    if (this.homeMarker) this.group.remove(this.homeMarker);
    this.home = { lat, lon };
    const p = latLonToVec3(lat, lon, R * 1.01);
    const g = new THREE.Group();
    g.position.copy(p);
    g.lookAt(p.clone().multiplyScalar(2));
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.24, 32), new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, side: THREE.DoubleSide }));
    const core = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }));
    core.position.z = 0.01;
    g.add(ring, core);
    this.homeMarker = g;
    this.homeRing = ring;
    this.group.add(g);
    this.homePos = p;
    return p;
  }

  // Great-circle arc that lifts off the surface, drawn progressively by a shader.
  buildArc() {
    if (this.arc) { this.group.remove(this.arc); this.arc.geometry.dispose(); }
    const a = latLonToVec3(this.home.lat, this.home.lon, 1);
    const b = latLonToVec3(KAOHSIUNG.lat + 1.1, 120.95, 1);
    const ang = a.angleTo(b);
    const lift = 0.06 + ang * 0.22;
    const pts = [];
    for (let i = 0; i <= 80; i++) {
      const k = i / 80;
      const p = new THREE.Vector3().copy(a).lerp(b, k).normalize();
      if (ang > 0.001) {
        const q = new THREE.Quaternion().setFromUnitVectors(a, b);
        p.copy(a).applyQuaternion(new THREE.Quaternion().slerpQuaternions(new THREE.Quaternion(), q, k));
      }
      p.multiplyScalar(R * (1.01 + Math.sin(Math.PI * k) * lift));
      pts.push(p);
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    this.curve = curve;
    const geo = new THREE.TubeGeometry(curve, 160, 0.045, 8, false);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { progress: { value: 0 }, a: { value: new THREE.Color('#FFFFFF') }, b: { value: new THREE.Color('#FFC53A') } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform float progress; uniform vec3 a; uniform vec3 b; varying vec2 vUv;
        void main(){ if (vUv.x > progress) discard; float tail = smoothstep(progress-0.6, progress, vUv.x); gl_FragColor = vec4(mix(a,b,vUv.x), 0.35 + tail*0.65); }`,
    });
    this.arc = new THREE.Mesh(geo, mat);
    this.group.add(this.arc);
    if (!this.comet) {
      this.comet = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#FFE3A3', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      this.comet.scale.setScalar(1.1);
      this.group.add(this.comet);
    }
    this.comet.visible = false;
    return ang;
  }

  async flyHomeToTaiwan(camera) {
    const ang = this.buildArc();
    const mid = this.curve.getPoint(0.5);
    const { lat, lon } = vec3ToLatLon(mid);
    this.autoSpin = false;
    await this.faceLatLon(lat, lon, 1.4);
    const dur = 1.8 + ang * 1.4;
    this.comet.visible = true;
    this.comet.material.opacity = 0.35;
    if (this.rider === this.aircraft) this.aircraft.visible = true;
    this.flightProgress = 0;
    const startPitch = this.group.rotation.x, startYaw = this.group.rotation.y;
    const tw = this.targetAngles(KAOHSIUNG.lat + 1.1, 120.95);
    const yaw1 = this.nearestYaw(startYaw, tw.y);
    await tween({
      duration: dur,
      ease: easeInOut,
      onUpdate: (e) => {
        this.flightProgress = e;
        this.arc.material.uniforms.progress.value = e;
        this.comet.position.copy(this.curve.getPoint(Math.min(e, 1)));
        if (this.rider) {
          this.rider.position.copy(this.comet.position);
          const n = this.comet.position.clone().normalize();
          const tan = this.curve.getTangent(Math.min(e, 0.999));
          this.rider.up.copy(n);
          this.rider.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
          const fwd = tan.clone().projectOnPlane(n).normalize();
          const localZ = new THREE.Vector3(0, 0, 1).applyQuaternion(this.rider.quaternion);
          const ang = Math.atan2(localZ.clone().cross(fwd).dot(n), localZ.dot(fwd));
          this.rider.rotateOnWorldAxis(n, ang);
        }
        const k = clamp((e - 0.35) / 0.65, 0, 1);
        const kk = k * k * (3 - 2 * k);
        this.group.rotation.x = startPitch + (tw.x - startPitch) * kk;
        this.group.rotation.y = startYaw + (yaw1 - startYaw) * kk;
      },
    });
    this.flightProgress = 1;
    const z0 = camera.position.z;
    await tween({
      duration: 1.6,
      onUpdate: (e) => { camera.position.z = z0 + (R * 2.05 - z0) * e; this.comet.material.opacity = 1 - e; },
    });
  }

  targetAngles(lat, lon) {
    const p = latLonToVec3(lat, lon, 1);
    const yaw = Math.atan2(p.x, p.z);
    const zr = Math.sqrt(p.x * p.x + p.z * p.z);
    return { x: Math.atan2(p.y, zr), y: -yaw };
  }

  nearestYaw(from, to) {
    let d = to - from;
    d = ((d + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    return from + d;
  }

  faceLatLon(lat, lon, duration = 1.2) {
    const t = this.targetAngles(lat, lon);
    if (!duration) { this.group.rotation.set(t.x, t.y, 0); return Promise.resolve(); }
    const x0 = this.group.rotation.x, y0 = this.group.rotation.y;
    const y1 = this.nearestYaw(y0, t.y);
    return tween({ duration, onUpdate: (e) => { this.group.rotation.x = x0 + (t.x - x0) * e; this.group.rotation.y = y0 + (y1 - y0) * e; } });
  }

  // pointer interaction
  drag(dx, dy) {
    this.autoSpin = false;
    this.group.rotation.y += dx * 0.005;
    this.group.rotation.x = clamp(this.group.rotation.x + dy * 0.004, -1.2, 1.2);
    this.vel.x = dx * 0.005; this.vel.y = dy * 0.004;
  }

  pick(raycaster) {
    const hit = raycaster.intersectObject(this.ocean, false)[0];
    if (!hit) return null;
    const local = this.group.worldToLocal(hit.point.clone());
    return vec3ToLatLon(local);
  }

  update(dt) {
    this.time += dt;
    if (this.autoSpin) this.group.rotation.y += dt * 0.06;
    else if (!this.dragging) {
      this.group.rotation.y += this.vel.x; this.group.rotation.x = clamp(this.group.rotation.x + this.vel.y, -1.2, 1.2);
      this.vel.x *= 0.92; this.vel.y *= 0.92;
    }
    const s = 1 + 0.25 * Math.sin(this.time * 3);
    this.twRing.scale.setScalar(s);
    this.twRing.material.opacity = 1.2 - s * 0.6;
    if (this.homeRing) { const h = 1 + 0.35 * ((this.time * 1.2) % 1); this.homeRing.scale.setScalar(h); this.homeRing.material.opacity = 1.4 - h; }
  }

  // world-space normal of a local point, for label culling
  normalOf(localPoint) {
    return () => localPoint.clone().applyQuaternion(this.group.quaternion).normalize();
  }
}

export const GLOBE_RADIUS = R;
