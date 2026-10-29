import * as THREE from 'three';
import { tween, easeInOut, glowTexture, clamp } from '../util.js';

// Cloudlet is an original non-human cloud companion. Palette choices colour its cloud and scarf.
export const SKINS=['#F3FAFF','#E7F2FF','#FFF2D8','#E6F6EC','#F2E9FF'];
export const OUTFITS=['#36348E','#E07A5F','#3E9E86','#D9A23B','#8A6CC4'];
const mat=(color,extra={})=>new THREE.MeshLambertMaterial({color,...extra});
const box=(w,h,d,m)=>new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
const cyl=(a,b,h,m,n=12)=>new THREE.Mesh(new THREE.CylinderGeometry(a,b,h,n),m);
const ball=(r,m,detail=2)=>new THREE.Mesh(new THREE.IcosahedronGeometry(r,detail),m);

export class Traveler {
  constructor(){
    this.group=new THREE.Group();this.group.name='cloudlet-mascot';this.root=new THREE.Group();this.group.add(this.root);
    this.m={skin:mat(SKINS[1]),outfit:mat(OUTFITS[0]),pack:mat('#E0AA44'),strap:mat('#7D633E'),white:mat('#FFFFFF'),gold:mat('#FFC53A'),ink:mat('#23215F')};
    this.t=0;this.mode='idle';this.build();this.setStage('traveler');
    this.ring=new THREE.Mesh(new THREE.RingGeometry(.5,.63,32).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:'#FFC53A',transparent:true,opacity:.7,depthWrite:false}));
    this.ring.position.y=.02;this.group.add(this.ring);
    const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(),color:'#FFE3A3',transparent:true,opacity:.18,depthWrite:false}));glow.scale.setScalar(2.8);glow.position.y=.8;this.group.add(glow);
    this.group.traverse(o=>{if(o.isMesh&&o!==this.ring)o.castShadow=true;});
  }
  build(){
    const m=this.m;
    this.torso=new THREE.Group();this.torso.position.y=.8;this.root.add(this.torso);
    this.body=ball(.58,m.skin,3);this.body.scale.set(1,.9,.9);this.torso.add(this.body);
    for(const [x,y,z,r]of [[-.38,.18,0,.35],[.38,.18,0,.35],[0,.37,-.02,.4],[-.22,-.24,.03,.34],[.23,-.24,.03,.34]]){const puff=ball(r,m.skin,2);puff.position.set(x,y,z);this.torso.add(puff);}
    const scarf=new THREE.Mesh(new THREE.TorusGeometry(.43,.085,8,32).rotateX(Math.PI/2),m.outfit);scarf.position.y=-.16;this.torso.add(scarf);
    const ribbon=box(.2,.4,.055,m.outfit);ribbon.position.set(.29,-.37,.4);ribbon.rotation.z=-.2;this.torso.add(ribbon);this.ribbon=ribbon;
    this.head=new THREE.Group();this.head.position.y=.28;this.torso.add(this.head);
    this.eyes=[-.16,.16].map(x=>{const eye=ball(.055,m.ink,1);eye.scale.set(.85,1.2,.6);eye.position.set(x,.02,.51);this.head.add(eye);const glint=ball(.014,m.white,1);glint.position.set(x-.012,.044,.545);this.head.add(glint);return eye;});
    for(const x of [-.28,.28]){const cheek=ball(.06,mat('#F1A2AE'),1);cheek.scale.set(1,.55,.35);cheek.position.set(x,-.08,.48);this.head.add(cheek);}
    const smile=new THREE.Mesh(new THREE.TorusGeometry(.075,.012,5,20,Math.PI),m.ink);smile.rotation.z=Math.PI;smile.position.set(0,-.1,.55);this.head.add(smile);
    this.arms=[-1,1].map(side=>{const pivot=new THREE.Group();pivot.position.set(side*.55,-.02,0);const wing=ball(.25,m.skin,2);wing.scale.set(1.25,.44,.7);wing.position.x=side*.13;pivot.add(wing);this.torso.add(pivot);return pivot;});
    this.legs=[-.23,.23].map(x=>{const foot=ball(.18,m.skin,2);foot.scale.set(1,.55,1.1);foot.position.set(x,.2,.03);this.root.add(foot);return foot;});
    this.logo=new THREE.Group();const badge=ball(.13,m.gold,1);badge.scale.z=.25;this.logo.add(badge);const needle=box(.04,.15,.015,m.ink);needle.rotation.z=-.45;needle.position.z=.04;this.logo.add(needle);this.logo.position.set(-.14,-.17,.54);this.torso.add(this.logo);
    this.bigPack=new THREE.Group();const pack=box(.5,.6,.3,m.pack);pack.position.set(0,.05,-.5);const flap=box(.52,.12,.32,m.outfit);flap.position.set(0,.4,-.5);this.bigPack.add(pack,flap);this.torso.add(this.bigPack);
    this.smallPack=box(.36,.4,.2,m.gold);this.smallPack.position.set(0,-.06,-.53);this.torso.add(this.smallPack);
    this.cap=new THREE.Group();const crown=new THREE.Mesh(new THREE.SphereGeometry(.3,14,8,0,Math.PI*2,0,Math.PI/2),m.outfit);const brim=cyl(.22,.22,.04,m.outfit);brim.scale.z=1.3;brim.position.z=.2;this.cap.add(crown,brim);this.cap.position.y=.65;this.head.add(this.cap);
    this.mortar=new THREE.Group();const board=box(.75,.05,.75,m.ink);board.position.y=.42;board.rotation.y=Math.PI/4;const base=cyl(.27,.29,.14,m.ink);base.position.y=.33;const tassel=box(.03,.26,.03,m.gold);tassel.position.set(.35,.29,.12);this.mortar.add(board,base,tassel);this.mortar.position.y=.38;this.head.add(this.mortar);
    this.gown=new THREE.Mesh(new THREE.CylinderGeometry(.52,.7,.55,14,1,true),mat('#23215F',{side:THREE.DoubleSide}));this.gown.position.y=-.2;this.torso.add(this.gown);
    this.gear=new THREE.Group();this.gear.position.y=.48;this.head.add(this.gear);this.handGear=new THREE.Group();this.handGear.position.set(.2,-.12,.2);this.arms[1].add(this.handGear);
  }
  setLook({skin,outfit}){if(skin)this.m.skin.color.set(skin);if(outfit){this.m.outfit.color.set(outfit);this.outfitColor=outfit;}}
  setStage(stage,islandId){this.stage=stage;this.bigPack.visible=this.cap.visible=stage==='traveler';this.smallPack.visible=this.logo.visible=stage==='student';this.mortar.visible=this.gown.visible=stage==='graduate';this.gear.clear();this.handGear.clear();this.clearExtras();if(stage==='pro')this.addGear(islandId);}
  addGear(id) {
    const m = this.m;
    const H = this.gear, Hand = this.handGear;
    if (id === 'maker') { const hat = new THREE.Mesh(new THREE.SphereGeometry(0.29, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#F2B33D')); hat.position.y = 0.3; const brim = cyl(0.33, 0.33, 0.03, mat('#F2B33D'), 14); brim.position.y = 0.3; H.add(hat, brim); }
    if (id === 'leisure') { const band = cyl(0.24, 0.24, 0.12, m.white, 12); band.position.y = 0.4; const puff = ball(0.26, m.white, 1); puff.position.y = 0.6; puff.scale.set(1.1, 0.8, 1.1); H.add(band, puff); }
    if (id === 'health') { const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.66, 0.5, 12, 1, true), mat('#FFFFFF', { side: THREE.DoubleSide })); coat.position.y = -0.1; this.torso.add(coat); this._coat = coat; const cross = box(0.1, 0.03, 0.02, mat('#2E8A63')); cross.position.set(0.2, 0.02, 0.63); this.torso.add(cross); this._cross = cross; }
    if (id === 'chip') { const goggles = box(0.42, 0.08, 0.06, mat('#7FD3EA')); goggles.position.set(0, 0.24, 0.23); H.add(goggles); const wafer = cyl(0.16, 0.16, 0.02, mat('#C7D2F2'), 20); wafer.rotation.x = Math.PI / 2; Hand.add(wafer); }
    if (id === 'code') { const phones = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.03, 6, 20, Math.PI), m.ink); phones.position.y = 0.22; const cups = [-0.28, 0.28].map((x) => { const c = ball(0.07, mat('#9C8FE0'), 0); c.position.set(x, 0.2, 0); return c; }); H.add(phones, ...cups); const laptop = box(0.26, 0.02, 0.18, mat('#C9CFD8')); Hand.add(laptop); }
    if (id === 'story') { const beret = ball(0.24, mat('#A8457A'), 1); beret.scale.set(1.2, 0.35, 1.2); beret.position.set(0.04, 0.42, 0); H.add(beret); const clap = box(0.2, 0.14, 0.03, m.ink); Hand.add(clap); }
    if (id === 'business') { const tie = box(0.06, 0.24, 0.02, mat('#C2552E')); tie.position.set(0, 0, 0.63); this.torso.add(tie); this._tie = tie; const bag = box(0.28, 0.2, 0.08, mat('#5B4636')); bag.position.y = -0.08; Hand.add(bag); }
  }

  clearExtras() { for (const k of ['_coat', '_cross', '_tie']) if (this[k]) { this.torso.remove(this[k]); this[k] = null; } }

  // ---------- movement ----------
  face(target) {
    const p = this.group.getWorldPosition(new THREE.Vector3());
    const dx = target.x - p.x, dz = target.z - p.z;
    if (Math.abs(dx) + Math.abs(dz) < 1e-4) return;
    const direction=new THREE.Vector3(dx,0,dz);
    if(this.group.parent)direction.applyQuaternion(this.group.parent.getWorldQuaternion(new THREE.Quaternion()).invert());
    this.group.rotation.y = Math.atan2(direction.x,direction.z);
  }

  // arc jump in world space (used to hop onto islands); reparents to `parent` on landing
  hop(parent, localTarget, duration = 2.2) {
    const scene = this.group.parent;
    const start = this.group.getWorldPosition(new THREE.Vector3());
    const end = parent.localToWorld(localTarget.clone());
    if (scene && !scene.isScene) { let s = scene; while (s.parent) s = s.parent; s.attach(this.group); }
    this.face(end);
    this.mode = 'jump';
    const height = Math.max(8, start.distanceTo(end) * 0.35);
    return tween({ duration, ease: easeInOut, onUpdate: (e) => {
      const live = parent.localToWorld(localTarget.clone());
      this.group.position.lerpVectors(start, live, e);
      this.group.position.y += Math.sin(Math.PI * e) * height;
      this.root.rotation.x = Math.sin(Math.PI * e) * 0.5;
    } }).then(() => {
      parent.attach(this.group);
      this.group.position.copy(localTarget);
      this.root.rotation.x = 0;
      this.mode = 'idle';
    });
  }

  walkTo(localTarget, duration = 1.6) {
    const from = this.group.position.clone();
    const dx = localTarget.x - from.x, dz = localTarget.z - from.z;
    if (Math.hypot(dx, dz) > 0.01) this.group.rotation.y = Math.atan2(dx, dz);
    this.mode = 'walk';
    return tween({ duration, ease: (k) => k, onUpdate: (e) => this.group.position.lerpVectors(from, localTarget, e) }).then(() => { this.mode = 'idle'; });
  }

  wave(seconds = 1.6) { this.mode = 'wave'; clearTimeout(this._w); this._w = setTimeout(() => { if (this.mode === 'wave') this.mode = 'idle'; }, seconds * 1000); }
  cheer(seconds = 1.4) { this.mode = 'cheer'; clearTimeout(this._w); this._w = setTimeout(() => { if (this.mode === 'cheer') this.mode = 'idle'; }, seconds * 1000); }

  update(dt){
    this.t+=dt;const t=this.t;
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let lift=Math.sin(t*2.3)*(reduced ? .012 : .055);
    this.arms[0].rotation.z=-.18+Math.sin(t*3)*.08;
    this.arms[1].rotation.z=.18-Math.sin(t*3)*.08;
    if(this.mode==='wave')this.arms[1].rotation.z=.9+Math.sin(t*8)*.25;
    if(this.mode==='cheer'){this.arms[0].rotation.z=-.9;this.arms[1].rotation.z=.9;lift+=Math.abs(Math.sin(t*5))*(reduced ? .02 : .18);}
    if(this.mode==='walk')lift+=Math.abs(Math.sin(t*7))*.04;
    this.root.position.y=lift;this.head.rotation.y=this.mode==='idle'?Math.sin(t*.6)*.035:0;
    const blink=t%7>6.85?.15:1;for(const eye of this.eyes)eye.scale.y=1.2*blink;
    this.ribbon.rotation.z=-.2+Math.sin(t*2.3)*.06;
    this.ring.material.opacity=.55+Math.sin(t*3)*.14;this.ring.visible=this.mode!=='jump';
  }
}
export const clampScale=s=>clamp(s,.4,6);
