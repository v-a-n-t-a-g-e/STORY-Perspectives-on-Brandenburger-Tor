import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { DefaultEnvironment } from "./lib/environment";
import { importGLTF, importPointCloud, importSplat } from "./lib/importers";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import projections from "./data/projections";
import {
  getAspectRatio,
  easeInOut,
  getProjectionOccurances,
} from "./lib/helpers";
import { loadImages } from "./lib/images";

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

function mount(container, html) {
  container.innerHTML = html;

  const appearObserver = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) onAppear(e.target.dataset.projection, e);
      }
    },
    { rootMargin: "-10% 0%" },
  );

  const focusObserver = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) onEnterFocus(e.target.dataset.projection, e);
        else onLeaveFocus(e.target.dataset.projection, e);
      }
    },
    { rootMargin: "-40% 0%" },
  );

  container.querySelectorAll("[data-projection]").forEach((el) => {
    appearObserver.observe(el);
    focusObserver.observe(el);
  });

  return () => {
    appearObserver.disconnect();
    container.innerHTML = "";
  };
}

let teardown = () => {};
function show(story, projection) {
  controls.enableZoom = false;
  const overlay = document.querySelector("article");
  teardown();
  teardown = mount(overlay, stories[story]);

  if (projection) {
    const el = document.querySelector(
      `article [data-projection="${projection}"]`,
    );
    scrollTo(
      0,
      el.getBoundingClientRect().y + window.scrollY - innerHeight * 0.8,
    );
  }
}

function onEnterFocus(projection) {
  const image = document.querySelector(
    `.images [data-projection-name="${projection}"]`,
  );
  image.style.opacity = 1;
}

function onLeaveFocus(projection) {
  const image = document.querySelector(
    `.images [data-projection-name="${projection}"]`,
  );
  image.style.opacity = 0;
}

function onAppear(projection) {
  const targetCam = scene
    .getObjectByName(projection)
    ?.getObjectByProperty("isPerspectiveCamera", true);
  if (!targetCam) return;

  const toPos = new THREE.Vector3();
  const toDir = new THREE.Vector3();
  targetCam.getWorldPosition(toPos);
  targetCam.getWorldDirection(toDir);

  const uprightTarget = new THREE.PerspectiveCamera();
  uprightTarget.lookAt(toDir);
  const toQuat = uprightTarget.quaternion.clone();
  // if (camera.quaternion.dot(toQuat) < 0) toQuat.negate();

  transition.fromPos.copy(camera.position);
  transition.fromQuat.copy(camera.quaternion);
  transition.fromFov = camera.fov;
  transition.toPos.copy(toPos);
  transition.toQuat.copy(toQuat);
  transition.toFov = targetCam.fov;
  transition.progress = 0;
  transition.active = true;

  controls.enabled = false;
}

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

const controls = new OrbitControls(camera, renderer.domElement);

controls.addEventListener("end", () => {
  controls.enableZoom = true;
});

controls.addEventListener("start", () => {
  teardown();
  const images = document.querySelectorAll(`.images [data-projection-name]`);
  for (const image of images) {
    image.style.opacity = 0;
  }
});

const spark = new SparkRenderer({ renderer });
scene.add(spark);

camera.position.x = 5;
camera.position.y = 5;
camera.position.z = 5;

scene.add(new DefaultEnvironment());

const lidar = await importPointCloud("models/Brandenburger Tor Lidar.ply");
lidar.position.set(-1.79, -1.01, 12.38);
scene.add(lidar);

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
// show("PetraGall");

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
