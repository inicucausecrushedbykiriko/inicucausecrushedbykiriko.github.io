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
import DeformablePolygonObject from '/quest5/lib/DSViz/DeformablePolygonObject.js';
import StandardTextObject from '/quest5/lib/DSViz/StandardTextObject.js';
import TwoDGridSegmented from '/quest5/lib/DS/TwoDGridSegmented.js';

async function init() {
  const canvas = document.createElement('canvas');
  canvas.id = "renderCanvas";
  document.body.appendChild(canvas);
  
  const renderer = new Renderer(canvas);
  await renderer.init();
  
  // List of deformable shape files.
  const shapes = [
    '/quest5/assets/box.polygon',
    '/quest5/assets/circle.polygon',
    '/quest5/assets/star.polygon',
    '/quest5/assets/human.polygon'
  ];
  
  let currentIndex = 0;
  
  // Create the first deformable polygon object.
  let currentShape = new DeformablePolygonObject(renderer._device, renderer._canvasFormat, shapes[currentIndex]);
  await renderer.appendSceneObject(currentShape);
  
  // Text overlay with instructions and status.
  const statusText = new StandardTextObject(
    "S: switch shape | D: toggle deform | R: reset\n" +
    "Shape: " + shapes[currentIndex] + "\n" +
    "Deform: OFF\n" +
    "Mouse: Unknown"
  );
  
  // For inside/outside detection, build a grid for the current shape.
  let grid = null;
  function updateInsideStatus(mousePos) {
    if (!grid) {
      grid = new TwoDGridSegmented(currentShape._polygon, 64);
      grid.init();
    }
    const outside = grid.isOutsideAssumeLocalConvex(mousePos);
    return outside ? "Outside" : "Inside";
  }
  
  // Key events: S, D, R.
  window.addEventListener("keydown", async (evt) => {
    if (evt.key.toLowerCase() === "s") {
      // Switch shape: remove current shape and load next one.
      renderer._objects = [];
      currentIndex = (currentIndex + 1) % shapes.length;
      currentShape = new DeformablePolygonObject(renderer._device, renderer._canvasFormat, shapes[currentIndex]);
      await renderer.appendSceneObject(currentShape);
      // Rebuild grid for new shape.
      grid = new TwoDGridSegmented(currentShape._polygon, 64);
      grid.init();
      statusText.updateText(
        "S: switch shape | D: toggle deform | R: reset\n" +
        "Shape: " + shapes[currentIndex] + "\n" +
        "Deform: " + (currentShape._deformEnabled ? "ON" : "OFF") + "\n" +
        "Mouse: Unknown"
      );
    } else if (evt.key.toLowerCase() === "d") {
      // Toggle deformation.
      currentShape._deformEnabled = !currentShape._deformEnabled;
      statusText.updateText(
        "S: switch shape | D: toggle deform | R: reset\n" +
        "Shape: " + shapes[currentIndex] + "\n" +
        "Deform: " + (currentShape._deformEnabled ? "ON" : "OFF") + "\n" +
        "Mouse: Unknown"
      );
    } else if (evt.key.toLowerCase() === "r") {
      // Reset: re-create the current shape.
      renderer._objects = [];
      currentShape = new DeformablePolygonObject(renderer._device, renderer._canvasFormat, shapes[currentIndex]);
      await renderer.appendSceneObject(currentShape);
      grid = new TwoDGridSegmented(currentShape._polygon, 64);
      grid.init();
      statusText.updateText(
        "S: switch shape | D: toggle deform | R: reset\n" +
        "Shape: " + shapes[currentIndex] + "\n" +
        "Deform: " + (currentShape._deformEnabled ? "ON" : "OFF") + "\n" +
        "Mouse: Unknown"
      );
    }
  });
  
  // Update mouse inside/outside status.
  canvas.addEventListener("mousemove", (evt) => {
    const rect = canvas.getBoundingClientRect();
    const sx = evt.clientX - rect.left;
    const sy = evt.clientY - rect.top;
    const ndcx = (sx / canvas.width) * 2 - 1;
    const ndcy = 1 - (sy / canvas.height) * 2;
    const mouseStatus = updateInsideStatus([ndcx, ndcy]);
    statusText.updateText(
      "S: switch shape | D: toggle deform | R: reset\n" +
      "Shape: " + shapes[currentIndex] + "\n" +
      "Deform: " + (currentShape._deformEnabled ? "ON" : "OFF") + "\n" +
      "Mouse: " + mouseStatus
    );
  });
  
  let lastTime = Date.now();
  const fps = 60;
  const msPF = 1000 / fps;
  function animate() {
    requestAnimationFrame(animate);
    let now = Date.now();
    if (now - lastTime > msPF) {
      lastTime = now;
      // Update geometry (e.g. mouse position) for the current shape.
      currentShape.updateGeometry();
      renderer.render();
    }
  }
  animate();
  
  return renderer;
}

init().then(() => {
  console.log("Quest5 scene running...");
}).catch((err) => {
  console.error("Error in quest5:", err);
});
