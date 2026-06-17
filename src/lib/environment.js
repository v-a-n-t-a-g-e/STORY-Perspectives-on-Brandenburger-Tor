import * as THREE from "three";

export class DefaultEnvironment extends THREE.Group {
  constructor() {
    super();
    this.add(new THREE.AmbientLight(0xffffff, 0.3));
    const dir1 = new THREE.DirectionalLight(0xffffff, 3);
    const dir2 = new THREE.DirectionalLight(0xffffff, 1);
    dir1.position.set(1, 2, 1);
    dir2.position.set(-1, 0.5, -1);
    this.add(dir1, dir2);
  }
}
