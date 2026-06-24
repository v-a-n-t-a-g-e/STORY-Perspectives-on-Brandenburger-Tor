import * as THREE from "three";

export function getAspectRatio(path) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth / img.naturalHeight);
    img.onerror = reject;
    img.src = path;
  });
}

export function easeInOut(t) {
  return t * t * (3 - 2 * t);
}

export function calculateRoll([rx, ry, rz]) {
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));

  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quat);

  const uprightCam = new THREE.PerspectiveCamera();
  uprightCam.lookAt(forward);
  const uprightQuat = uprightCam.quaternion;

  const delta = uprightQuat.clone().invert().multiply(quat);

  const rollDeg =
    2 * Math.acos(Math.min(Math.abs(delta.w), 1)) * (180 / Math.PI);

  const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);
  const uprightRight = forward
    .clone()
    .cross(new THREE.Vector3(0, 1, 0))
    .normalize();
  const sign = Math.sign(camUp.dot(uprightRight));
  const signedRollDeg = sign * rollDeg;

  return signedRollDeg;
}

export function getProjectionOccurances(stories) {
  const occurances = {};
  Object.entries(stories).forEach(([story, html]) => {
    const matches = html.matchAll(/data-projection="([^"]+)"/g);
    for (const match of matches) {
      occurances[match[1]] = story;
    }
  });
  return occurances;
}

export function getMouseVector(event, { width, height }) {
  return new THREE.Vector2(
    (event.clientX / width) * 2 - 1,
    -(event.clientY / height) * 2 + 1,
  );
}
