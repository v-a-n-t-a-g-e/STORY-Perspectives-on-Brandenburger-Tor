import { calculateRoll } from "./helpers";
export function loadImages(projections) {
  const container = document.querySelector(".images");

  for (const projection of projections) {
    const img = document.createElement("img");
    img.src = projection.image;
    img.dataset.projectionName = projection.name;

    const roll = calculateRoll(projection.transform.rotation);

    img.style.transform = `rotate(${roll}deg)`;
    container.appendChild(img);
  }
}
