/*!
 * Copyright (c) 2025 SingChun LEE @ Bucknell University. CC BY-NC 4.0.
 * 
 * This code is provided mainly for educational purposes at Bucknell University.
 *
 * This code is licensed under the Creative Commons Attribution-NonCommerical 4.0
 * International License. To view a copy of the license, visit 
 *   https://creativecommons.org/licenses/by-nc/4.0/
 * or send a letter to Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
 *
 * You are free to:
 *  - Share: copy and redistribute the material in any medium or format.
 *  - Adapt: remix, transform, and build upon the material.
 *
 * Under the following terms:
 *  - Attribution: You must give appropriate credit, provide a link to the license,
 *                 and indicate if changes where made.
 *  - NonCommerical: You may not use the material for commerical purposes.
 *  - No additional restrictions: You may not apply legal terms or technological 
 *                                measures that legally restrict others from doing
 *                                anything the license permits.
 */


import Renderer from '/quest5/lib/Viz/2DRenderer.js';
import PolygonObject from '/quest5/lib/DSViz/PolygonObject.js';
import DeformablePolygonObject from '/quest5/lib/DSViz/DeformablePolygonObject.js';
import TwoDGridSegmented from '/quest5/lib/DS/TwoDGridSegmented.js';
import StandardTextObject from '/quest5/lib/DSViz/StandardTextObject.js';

const shapeFiles = [
  '/quest5/assets/box.polygon',
  '/quest5/assets/circle.polygon',
  '/quest5/assets/star.polygon',
  '/quest5/assets/human.polygon'
];

let currentIndex = 0;
let mode = "static"; // "static" or "deform"
let currentShape = null;
let currentGrid = null; // for inside/outside testing
let mouseStatus = "Unknown";

async function loadCurrentShape(renderer) {
  // Clear previous scene objects.
  renderer._objects = [];
  currentGrid = null; // rebuild grid for new shape
  if (mode === "static") {
    currentShape = new PolygonObject(renderer._device, renderer._canvasFormat, shapeFiles[currentIndex]);
  } else {
    currentShape = new DeformablePolygonObject(renderer._device, renderer._canvasFormat, shapeFiles[currentIndex]);
  }
  await renderer.appendSceneObject(currentShape);
}

async function init() {
  const canvas = document.createElement('canvas');
  canvas.id = "renderCanvas";
  document.body.appendChild(canvas);
  
  const renderer = new Renderer(canvas);
  await renderer.init();
  
  // Load the initial shape (static mode)
  await loadCurrentShape(renderer);
  
  // Set up text overlay for instructions and status.
  const overlayText = new StandardTextObject(
    "s: switch shape | d: toggle deform | r: reset\nMode: " + mode + "\nMouse: " + mouseStatus
  );
  
  // Set up keyboard event handlers.
  window.addEventListener("keydown", async (evt) => {
    const key = evt.key.toLowerCase();
    if (key === "s") {
      // Switch shape
      currentIndex = (currentIndex + 1) % shapeFiles.length;
      await loadCurrentShape(renderer);
    } else if (key === "d") {
      // Toggle deform mode
      mode = mode === "static" ? "deform" : "static";
      await loadCurrentShape(renderer);
    } else if (key === "r") {
      // Reset the current shape by reloading it.
      await loadCurrentShape(renderer);
    }
  });
  
  // Update mouse inside/outside status using grid
  canvas.addEventListener("mousemove", (evt) => {
    let rect = canvas.getBoundingClientRect();
    let sx = evt.clientX - rect.left;
    let sy = evt.clientY - rect.top;
    let ndcx = (sx / canvas.width) * 2 - 1;
    let ndcy = 1 - (sy / canvas.height) * 2;
    let p = [ndcx, ndcy];
    if (currentShape && currentShape._polygon) {
      if (!currentGrid) {
        // Build grid from the polygon data of the current shape.
        currentGrid = new TwoDGridSegmented(currentShape._polygon, 64);
        currentGrid.init();
      }
      let outside = currentGrid.isOutsideAssumeLocalConvex(p);
      mouseStatus = outside ? "Outside" : "Inside";
    }
  });
  
  // Animation loop
  function animate() {
    requestAnimationFrame(animate);
    renderer.render();
  }
  animate();
  
  // Update overlay text every 100ms.
  setInterval(() => {
    overlayText.updateText(
      "s: switch shape | d: toggle deform | r: reset\n" +
      "Mode: " + mode + "\n" +
      "Mouse: " + mouseStatus
    );
  }, 100);
  
  return renderer;
}

init().then(() => {
  console.log("Quest5 scene running...");
}).catch(err => {
  console.error("Error in quest5:", err);
});
