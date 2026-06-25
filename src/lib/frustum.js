import * as THREE from "three";

function buildFrustumGeometry(fov, aspect, near, far) {
  const halfH_n = Math.tan((fov * Math.PI) / 360) * near;
  const halfW_n = halfH_n * aspect;
  const halfH_f = Math.tan((fov * Math.PI) / 360) * far;
  const halfW_f = halfH_f * aspect;

  const v = new Float32Array([
    -halfW_n,
    halfH_n,
    -near, // 0 near TL
    halfW_n,
    halfH_n,
    -near, // 1 near TR
    halfW_n,
    -halfH_n,
    -near, // 2 near BR
    -halfW_n,
    -halfH_n,
    -near, // 3 near BL
    -halfW_f,
    halfH_f,
    -far, // 4 far TL
    halfW_f,
    halfH_f,
    -far, // 5 far TR
    halfW_f,
    -halfH_f,
    -far, // 6 far BR
    -halfW_f,
    -halfH_f,
    -far, // 7 far BL
  ]);

  const idx = [
    0,
    1,
    2,
    0,
    2,
    3, // near
    4,
    6,
    5,
    4,
    7,
    6, // far
    0,
    5,
    1,
    0,
    4,
    5, // top
    3,
    2,
    6,
    3,
    6,
    7, // bottom
    0,
    3,
    7,
    0,
    7,
    4, // left
    1,
    6,
    2,
    1,
    5,
    6, // right
  ];

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(v, 3));
  geo.setIndex(idx);
  return geo;
}

export function createFrustumMesh(fov, aspect, near, far) {
  const geo = buildFrustumGeometry(fov, aspect, near, far);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  return new THREE.Mesh(geo, mat);
}

export function createFrustumWireframe(fov, aspect, near, far) {
  const geo = new THREE.EdgesGeometry(
    buildFrustumGeometry(fov, aspect, near, far),
  );
  const mat = new THREE.LineBasicMaterial({
    color: 0xffffff,
  });
  const wireframe = new THREE.LineSegments(geo, mat);
  wireframe.visible = false;
  return wireframe;
}
