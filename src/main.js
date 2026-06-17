import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { DefaultEnvironment } from "./lib/environment";
import { importGLTF, importPointCloud, importSplat } from "./lib/importers";
import { SparkRenderer } from "@sparkjsdev/spark";
import projections from "./data/projections";
import { getAspectRatio } from "./lib/helpers";

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
  scene.add(group);
  let splat = await importSplat(projection.path);

  group.position.set(...projection.transform.position);
  group.rotation.set(...projection.transform.rotation);
  group.scale.set(...projection.transform.scale);
  group.add(splat);

  let ratio = await getAspectRatio(projection.image);
  let cam = new THREE.PerspectiveCamera(projection.fov, ratio, 5, 20);
  group.add(cam);
  let helper = new THREE.CameraHelper(cam);
  helper.position.set(...projection.transform.position);
  helper.rotation.set(...projection.transform.rotation);

  group.add(helper);
}

function animate(time) {
  controls.update();
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});
