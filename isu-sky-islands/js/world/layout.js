import * as THREE from 'three';

// Where each diorama lives in the shared sky scene. Only one region is visible at a time.
export const WORLD = {
  taiwan: new THREE.Vector3(0, 0, 0),
  kaohsiung: new THREE.Vector3(500, 0, 0),
  campus: new THREE.Vector3(1000, 0, 0),
};
WORLD.islands = WORLD.campus.clone().add(new THREE.Vector3(0, 46, 0));
