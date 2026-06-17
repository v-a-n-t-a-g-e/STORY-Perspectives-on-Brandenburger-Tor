import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { PLYLoader } from "three/addons/loaders/PLYLoader.js";
import { SplatMesh } from "@sparkjsdev/spark";

export function importGLTF(url) {
  const loader = new GLTFLoader();
  return new Promise((resolve) =>
    loader.load(url, (model) => resolve(model.scene)),
  );
}

export async function importPointCloud(url) {
  const loader = new PLYLoader();
  const geometry = await new Promise((resolve) => loader.load(url, resolve));

  const mat = new THREE.PointsMaterial({
    size: 0.01,
    sizeAttenuation: false,
  });

  return new THREE.Points(geometry, mat);
}

export async function importSplat(url, { maxDist = 20, maxSize = 0.02 } = {}) {
  const original = await new Promise(
    (resolve) => new SplatMesh({ url, onLoad: resolve }),
  );

  if (!original.packedSplats) return original;

  const passing = [];
  original.packedSplats.forEachSplat((index, center, scales) => {
    const tooFar = center.length() > maxDist;
    const tooBig = Math.max(scales.x, scales.y, scales.z) > maxSize;
    if (!tooFar && !tooBig) passing.push(index);
  });

  const filteredSplats = original.packedSplats.extractSplats(
    new Uint32Array(passing),
    false,
  );
  const mesh = new SplatMesh({ packedSplats: filteredSplats });
  await mesh.initialized;
  original.dispose();
  return mesh;
}
