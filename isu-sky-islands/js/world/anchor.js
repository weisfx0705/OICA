import * as THREE from 'three';
import { glowTexture } from '../util.js';

// A program-specific anchor: landing ripple, orbiting rings, rising particles and an anchor glyph.
export function createAnchorEffect(quality={}) {
 const group=new THREE.Group();group.name='program-anchor-effect';
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const gold=new THREE.MeshBasicMaterial({color:'#FFD46A',transparent:true,opacity:.95,depthWrite:false});
 const rings=[1.3,1.95].map((radius,i)=>{const mesh=new THREE.Mesh(new THREE.TorusGeometry(radius,.055,7,56).rotateX(-Math.PI/2),gold);mesh.position.y=.16+i*.13;group.add(mesh);return mesh;});
 const ripple=new THREE.Mesh(new THREE.RingGeometry(.97,1.04,56).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:'#FFE7A2',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));ripple.position.y=.21;group.add(ripple);
 const beam=new THREE.Mesh(new THREE.CylinderGeometry(.22,.8,11,24,1,true).translate(0,5.5,0),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{strength:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 vUv;uniform float strength;void main(){float fade=smoothstep(0.,.1,vUv.y)*(1.-smoothstep(.65,1.,vUv.y));float streak=.65+.35*cos(vUv.x*37.7);gl_FragColor=vec4(1.,.86,.47,strength*fade*streak);}'}));group.add(beam);
 const glyph=new THREE.Group();glyph.position.y=7.7;glyph.name='anchor-glyph';
 const top=new THREE.Mesh(new THREE.TorusGeometry(.18,.045,7,24),gold);top.position.y=.87;
 const stem=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,1.55,8),gold);stem.position.y=-.05;
 const cross=new THREE.Mesh(new THREE.BoxGeometry(.82,.11,.11),gold);cross.position.y=.2;
 const hook=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-.75,-.3,0),new THREE.Vector3(-.58,-.75,0),new THREE.Vector3(0,-.94,0),new THREE.Vector3(.58,-.75,0),new THREE.Vector3(.75,-.3,0)]),36,.06,7,false),gold);
 glyph.add(top,stem,cross,hook);group.add(glyph);
 const flare=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(),color:'#FFE6A3',transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));flare.position.y=7.7;flare.scale.setScalar(4);group.add(flare);
 const count=quality.lite?12:26,positions=new Float32Array(count*3);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
 const particles=new THREE.Points(geometry,new THREE.PointsMaterial({color:'#FFF5CD',size:.18,transparent:true,opacity:.85,depthWrite:false,blending:THREE.AdditiveBlending}));particles.visible=!reduced;group.add(particles);
 let age=0;
 return {group,update(dt){
   age+=dt;const pop=reduced?1:Math.min(1,age/.65);glyph.scale.setScalar(pop*(1+Math.sin(pop*Math.PI)*.2));glyph.rotation.y=reduced?0:age*.42;
   beam.material.uniforms.strength.value=pop*(age<2?.55:.28);
   rings.forEach((ring,i)=>{const scale=reduced?1:1+Math.sin(age*2+i)*.035;ring.scale.setScalar(scale);});
   const wave=(age%2.8)/2.8;ripple.visible=!reduced;ripple.scale.setScalar(1.2+wave*2.5);ripple.material.opacity=(1-wave)*.75;
   flare.material.opacity=pop*(age<1.5?.42:.16);
   for(let i=0;i<count;i++){const phase=i/count;const angle=phase*Math.PI*2+age*(.7+phase*.4);const y=((age*(1.9+phase)+phase*8)%9);const r=1.1+Math.sin(phase*7+age)*.25;positions[i*3]=Math.cos(angle)*r;positions[i*3+1]=y;positions[i*3+2]=Math.sin(angle)*r;}
   geometry.attributes.position.needsUpdate=true;
 },dispose(){group.removeFromParent();const geos=new Set(),mats=new Set();group.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());}};
}
