import * as THREE from "three";

export function createStoryHandler({
  scene,
  camera,
  transition,
  controls,
  stories,
}) {
  let teardown = () => {};

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

  function show(story, projection) {
    controls.enableZoom = false;
    showStory();
    const overlay = document.querySelector("article");
    document.querySelector(".explore").style.visibility = "visible";
    overlay.style.pointerEvents = "all";
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

  function clearStory() {
    document.querySelector("article").style.pointerEvents = "none";
    document.querySelector(".explore").style.visibility = "hidden";
    teardown();
    const images = document.querySelectorAll(".images [data-projection-name]");
    for (const image of images) image.style.opacity = 0;
  }

  function hideStory() {
    document.querySelector("article").style.opacity = 0;
    const images = (document.querySelector(".images").style.opacity = 0);
  }

  function showStory() {
    document.querySelector("article").style.opacity = 1;
    const images = (document.querySelector(".images").style.opacity = 1);
  }

  return { show, clearStory, hideStory, showStory };
}
