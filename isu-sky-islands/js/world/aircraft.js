import * as THREE from 'three';

// A passenger plane, facing local +Z. The avatar is inside during globe travel.
export function buildAircraft() {
 const g=new THREE.Group();g.name='traveler-aircraft';
 const white=new THREE.MeshLambertMaterial({color:'#FAFCFF'}),blue=new THREE.MeshLambertMaterial({color:'#36348E'}),glass=new THREE.MeshLambertMaterial({color:'#6CB8D8'});
 const body=new THREE.Mesh(new THREE.CapsuleGeometry(0.24,2.2,5,14).rotateX(Math.PI/2),white);g.add(body);
 const wingShape=new THREE.Shape();wingShape.moveTo(-0.2,0.45);wingShape.lineTo(-1.65,-0.55);wingShape.lineTo(-1.65,-0.8);wingShape.lineTo(0,-0.35);wingShape.lineTo(1.65,-0.8);wingShape.lineTo(1.65,-0.55);wingShape.lineTo(0.2,0.45);wingShape.closePath();
 const wing=new THREE.Mesh(new THREE.ExtrudeGeometry(wingShape,{depth:0.07,bevelEnabled:false}).rotateX(Math.PI/2),white);wing.position.set(0,-0.02,0.1);g.add(wing);
 const tail=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.07,0.35),blue);tail.position.z=-0.95;g.add(tail);
 const fin=new THREE.Mesh(new THREE.BoxGeometry(0.075,0.7,0.5),blue);fin.position.set(0,0.32,-1.05);fin.rotation.x=-0.25;g.add(fin);
 for(const side of [-1,1]){
  const engine=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,0.65,10).rotateX(Math.PI/2),blue);engine.position.set(side*0.72,-0.21,-0.02);g.add(engine);
  for(let i=0;i<6;i++){const win=new THREE.Mesh(new THREE.SphereGeometry(0.045,6,4),glass);win.position.set(side*0.235,0.08,0.7-i*0.25);g.add(win);}
 }
 const cockpit=new THREE.Mesh(new THREE.SphereGeometry(0.23,10,6),glass);cockpit.scale.set(0.86,0.45,0.6);cockpit.position.set(0,0.13,1.04);g.add(cockpit);
 g.scale.setScalar(0.65);g.visible=false;return g;
}
