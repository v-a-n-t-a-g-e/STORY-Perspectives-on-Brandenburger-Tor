// IMPORTS
//
// LIBRARIES

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SparkRenderer } from "@sparkjsdev/spark";

// SCRIPTS

import { DefaultEnvironment } from "./lib/environment";
import { importGLTF, importPointCloud, importSplat } from "./lib/importers";
import {
  getAspectRatio,
  easeInOut,
  getProjectionOccurances,
  getMouseVector,
} from "./lib/helpers";
import { loadImages } from "./lib/images";
import { createStoryHandler } from "./lib/storyHandling";
import { createFrustumMesh, createFrustumWireframe } from "./lib/frustum";

// DATA

import projections from "./data/projections";

// STYLESHEET

import "./style.css";

// STORIES

import Architektur from "./stories/architektur.html?raw";
import PetraGall from "./stories/petra_gall.html?raw";
import Politiker from "./stories/politiker.html?raw";

// CONSTANTS

const stories = { Architektur, PetraGall, Politiker };
const occurances = getProjectionOccurances(stories);
const raycaster = new THREE.Raycaster();

// VARIABLES

let prevTime = 0;

// THREE JS
//
// SCENE SETUP
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x000000, 50, 250);
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.querySelector("#app").appendChild(renderer.domElement);

scene.add(new DefaultEnvironment());

camera.position.x = 25;
camera.position.y = 25;
camera.position.z = 25;
camera.lookAt(0, 0, 0);

// CONTROLS

const controls = new OrbitControls(camera, renderer.domElement);
controls.zoomSpeed = 2;
controls.maxDistance = 100;
// controls.zoomToCursor = true;

// SPARK (FOR GAUSSIAN SPLATS)
const spark = new SparkRenderer({ renderer });
scene.add(spark);

// MODELS
//
// LIDAR

const lidar = await importPointCloud("models/Brandenburger Tor Lidar.ply");
lidar.position.set(-1.79, -1.01, 12.38);
scene.add(lidar);

// SPLATS

const frustumMeshes = [];
const CAM_NEAR = 0.01;
const CAM_FAR = 17;

for (const projection of projections) {
  let group = new THREE.Group();
  group.name = projection.name;
  scene.add(group);
  let splat = await importSplat(projection.path);

  group.position.set(...projection.transform.position);
  group.rotation.set(...projection.transform.rotation);
  group.scale.set(...projection.transform.scale);
  group.add(splat);

  let ratio = await getAspectRatio(projection.image);
  let cam = new THREE.PerspectiveCamera(
    projection.fov,
    ratio,
    CAM_NEAR,
    CAM_FAR,
  );
  group.add(cam);

  const frustum = createFrustumMesh(projection.fov, ratio, CAM_NEAR, CAM_FAR);
  cam.add(frustum);
  const wireframe = createFrustumWireframe(
    projection.fov,
    ratio,
    CAM_NEAR,
    CAM_FAR,
  );
  cam.add(wireframe);
  frustumMeshes.push([frustum, wireframe, splat]);
}

// ANIMATION LOOP

function animate(time) {
  if (transition.active) {
    runTransition(time);
    if (transition.progress >= 1) {
      finalizeTransition();
    }
  } else {
    controls.update();
  }
  prevTime = time;
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

// TRANSITION

const transition = {
  active: false,
  fromPos: new THREE.Vector3(),
  toPos: new THREE.Vector3(),
  fromQuat: new THREE.Quaternion(),
  toQuat: new THREE.Quaternion(),
  fromFov: 50,
  toFov: 50,
  progress: 0,
};

function runTransition(time) {
  const duration = 0.5;
  const delta = (time - prevTime) / 1000;
  transition.progress = Math.min(transition.progress + delta / duration, 1);
  const t = easeInOut(transition.progress);

  camera.position.lerpVectors(transition.fromPos, transition.toPos, t);
  camera.quaternion.slerpQuaternions(transition.fromQuat, transition.toQuat, t);
  camera.fov = THREE.MathUtils.lerp(transition.fromFov, transition.toFov, t);
  camera.updateProjectionMatrix();
}

function finalizeTransition() {
  transition.active = false;
  controls.target
    .copy(camera.position)
    .add(new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion));
  controls.enabled = true;
  controls.update();
}

// DOM

const { show, clearStory, hideStory, showStory } = createStoryHandler({
  scene,
  camera,
  transition,
  controls,
  stories,
});

loadImages(projections);

// EVENTS

renderer.domElement.addEventListener("mousemove", (event) => {
  let hit = null;
  if (controls.enableZoom && !controlsActive) {
    raycaster.setFromCamera(getMouseVector(event, renderer.domElement), camera);
    hit =
      raycaster.intersectObjects(frustumMeshes.map(([mesh]) => mesh))[0]
        ?.object ?? null;
  }

  for (const [mesh, helper, splat] of frustumMeshes) {
    const isHit = mesh === hit;
    // helper.visible = isHit;
    mesh.material.opacity = isHit ? 0.05 : 0;
    splat.opacity = hit && !isHit ? 0.2 : 1;
  }
  lidar.material.opacity = hit ? 0.2 : 0.4;
  renderer.domElement.style.cursor = hit ? "pointer" : "";
});

const pointerDownPos = new THREE.Vector2();

renderer.domElement.addEventListener("pointerdown", (event) => {
  pointerDownPos.set(event.clientX, event.clientY);
});

renderer.domElement.addEventListener("click", (event) => {
  if (!controls.enableZoom) return;
  const dx = event.clientX - pointerDownPos.x;
  const dy = event.clientY - pointerDownPos.y;
  if (dx * dx + dy * dy > 9) return;

  raycaster.setFromCamera(getMouseVector(event, renderer.domElement), camera);
  const hit = raycaster.intersectObjects(frustumMeshes.map(([mesh]) => mesh))[0]
    ?.object;
  if (!hit) return;

  const projectionName = hit.parent.parent.name;
  const story = occurances[projectionName];
  if (story) {
    for (const [mesh, helper, splat] of frustumMeshes) {
      // helper.visible = false;
      mesh.material.opacity = 0;
      splat.opacity = 1;
    }
    lidar.material.opacity = 0.4;
    renderer.domElement.style.cursor = "";
    show(story, projectionName);
  }
});

// RESIZE

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// CONTROLS

const controlsStartPosition = new THREE.Vector3();
const controlsStartQuaternion = new THREE.Quaternion();
let controlsActive = false;

controls.addEventListener("start", () => {
  controlsActive = true;
  controlsStartPosition.copy(camera.position);
  controlsStartQuaternion.copy(camera.quaternion);
  hideStory();
});

controls.addEventListener("end", () => {
  controlsActive = false;
  const moved = camera.position.distanceTo(controlsStartPosition) > 0.5;
  const rotated = controlsStartQuaternion.angleTo(camera.quaternion) > 0.01;
  if (moved || rotated) {
    controls.enableZoom = true;
    clearStory();
  } else {
    showStory();
  }
});
