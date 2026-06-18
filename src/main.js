// IMPORTS
//
// LIBRARIES

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";

// SCRIPTS

import { DefaultEnvironment } from "./lib/environment";
import { importGLTF, importPointCloud, importSplat } from "./lib/importers";
import {
  getAspectRatio,
  easeInOut,
  getProjectionOccurances,
} from "./lib/helpers";
import { loadImages } from "./lib/images";
import { createStoryHandler } from "./lib/storyHandling";

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
  let cam = new THREE.PerspectiveCamera(projection.fov, ratio, 5, 20);
  group.add(cam);

  // let helper = new THREE.CameraHelper(cam);
  // scene.add(helper);
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

const { show, clearStory } = createStoryHandler({
  scene,
  camera,
  transition,
  controls,
  stories,
});

loadImages(projections);

// EVENTS
//
// DB CLICK

renderer.domElement.addEventListener("dblclick", (event) => {
  raycaster.setFromCamera(
    new THREE.Vector2(
      (event.clientX / renderer.domElement.width) * 2 - 1,
      -(event.clientY / renderer.domElement.height) * 2 + 1,
    ),
    camera,
  );
  const intersects = raycaster.intersectObjects(scene.children);
  const splat = intersects.find((i) => i.object instanceof SplatMesh);

  const projection = splat?.object?.parent?.name;
  const story = occurances[projection];
  if (story) show(story, projection);
});

// RESIZE

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// CONTROLS

controls.addEventListener("end", () => (controls.enableZoom = true));
controls.addEventListener("start", () => clearStory());
