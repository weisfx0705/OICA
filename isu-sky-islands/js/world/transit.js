import * as THREE from 'three';

// Lightweight schematic routes: white underlay, coloured line, vehicle and stop dots.
export function transitRoute(group, { id, points, color, closed = false, speed = 0.04, radius = 0.1, vehicle = 'train', stops = null, segments = null, surfaceHeight = null }) {
  const curve = new THREE.CatmullRomCurve3(points, closed, 'centripetal');
  if(surfaceHeight) {
    const pointOnCurve=curve.getPoint.bind(curve);
    curve.getPoint=(position,target=new THREE.Vector3())=>{pointOnCurve(position,target);target.y=surfaceHeight(target.x,target.z);return target;};
  }
  const route = new THREE.Group(); route.name = 'route-' + id;
  for (const [r,c] of [[radius * 1.45,'#FFFDF5'],[radius,color]]) {
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, segments || (closed ? 180 : 100), r, 5, closed), new THREE.MeshBasicMaterial({color:c}));
    if(c===color) mesh.position.y=radius*1.45;
    route.add(mesh);
  }
  const stopPoints=stops || points.filter((_,index)=>index%Math.ceil(points.length/9)===0);
  const dots=new THREE.InstancedMesh(new THREE.SphereGeometry(radius*2.4,6,4),new THREE.MeshBasicMaterial({color:'#FFFFFF'}),stopPoints.length);
  const dummy=new THREE.Object3D();stopPoints.forEach((p,i)=>{dummy.position.copy(p);dummy.position.y+=0.08;dummy.updateMatrix();dots.setMatrixAt(i,dummy.matrix);});route.add(dots);
  const mover=new THREE.Group(); mover.name='vehicle-'+id;
  const hull=new THREE.Mesh(new THREE.BoxGeometry(vehicle==='ferry'?0.85:0.45,0.32,vehicle==='ferry'?1.55:1.5),new THREE.MeshLambertMaterial({color}));
  const roof=new THREE.Mesh(new THREE.BoxGeometry(vehicle==='ferry'?0.6:0.47,0.22,0.9),new THREE.MeshLambertMaterial({color:'#F8FAFC'}));roof.position.y=0.25;
  mover.add(hull,roof);mover.position.copy(points[0]);route.add(mover);group.add(route);
  return {id,group:route,curve,mover,update(t){const phase=(t*speed)%1;const k=closed?phase:(Math.sin(t*speed*Math.PI*2-Math.PI/2)+1)/2;const direction=closed?1:Math.cos(t*speed*Math.PI*2-Math.PI/2)>=0?1:-1;const p=curve.getPointAt(k);const tangent=curve.getTangentAt(k).multiplyScalar(direction);mover.position.copy(p);mover.position.y+=0.25;mover.rotation.y=Math.atan2(tangent.x,tangent.z);}};
}
