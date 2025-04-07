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
/*!
 * quest5.js
 *
 * Main entry. Only one deformable shape is active at a time.
 * Key controls:
 *   S: switch shape
 *   D: toggle deformation simulation on/off
 *   R: reset current shape
 * The text overlay displays:
 *   - Instructions
 *   - Current shape filename
 *   - Whether deformation is ON/OFF
 *   - Whether the mouse is inside the current shape
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
  
  // List of shape files.
  const shapes = [
    '/quest5/assets/box.polygon',
    '/quest5/assets/circle.polygon',
    '/quest5/assets/star.polygon',
    '/quest5/assets/human.polygon'
  ];
  let currentShapeIndex = 0;
  
  let currentShapeObj = new DeformablePolygonObject(renderer._device, renderer._canvasFormat, shapes[currentShapeIndex]);
  await renderer.appendSceneObject(currentShapeObj);
  
  // Deformation is off by default.
  let deformEnabled = false;
  
  // Set up a grid for mouse inside/outside test.
  let grid = new TwoDGridSegmented(currentShapeObj._polygon, 64);
  await grid.init();
  let mouseStatus = "Unknown";
  
  // Text overlay.
  const statusText = new StandardTextObject(
    "s: switch shape, d: toggle deform, r: reset\n" +
    "Shape: " + shapes[currentShapeIndex] + "\n" +
    "Deform: OFF\n" +
    "Mouse: Unknown"
  );
  
  // Key controls.
  window.addEventListener("keydown", async (evt) => {
    if (evt.key === "s" || evt.key === "S") {
      renderer._objects = [];
      currentShapeIndex = (currentShapeIndex + 1) % shapes.length;
      currentShapeObj = new DeformablePolygonObject(renderer._device, renderer._canvasFormat, shapes[currentShapeIndex]);
      // When switching, start with deformation off.
      currentShapeObj._deformEnabled = false;
      deformEnabled = false;
      await renderer.appendSceneObject(currentShapeObj);
      // Rebuild grid for the new shape.
      grid = new TwoDGridSegmented(currentShapeObj._polygon, 64);
      await grid.init();
      statusText.updateText(
        "s: switch shape, d: toggle deform, r: reset\n" +
        "Shape: " + shapes[currentShapeIndex] + "\n" +
        "Deform: OFF\n" +
        "Mouse: " + mouseStatus
      );
    } else if (evt.key === "d" || evt.key === "D") {
      deformEnabled = !deformEnabled;
      currentShapeObj.toggleDeformation();
      statusText.updateText(
        "s: switch shape, d: toggle deform, r: reset\n" +
        "Shape: " + shapes[currentShapeIndex] + "\n" +
        "Deform: " + (deformEnabled ? "ON" : "OFF") + "\n" +
        "Mouse: " + mouseStatus
      );
    } else if (evt.key === "r" || evt.key === "R") {
      await currentShapeObj.resetShape();
      statusText.updateText(
        "s: switch shape, d: toggle deform, r: reset\n" +
        "Shape: " + shapes[currentShapeIndex] + "\n" +
        "Deform: " + (deformEnabled ? "ON" : "OFF") + "\n" +
        "Mouse: " + mouseStatus
      );
    }
  });
  
  // Update mouse inside/outside status.
  canvas.addEventListener("mousemove", (evt) => {
    let rect = canvas.getBoundingClientRect();
    let sx = evt.clientX - rect.left;
    let sy = evt.clientY - rect.top;
    let ndcx = (sx / canvas.width) * 2 - 1;
    let ndcy = 1 - (sy / canvas.height) * 2;
    let p = [ndcx, ndcy];
    if (grid) {
      let outside = grid.isOutsideAssumeLocalConvex(p);
      mouseStatus = outside ? "Outside" : "Inside";
    }
  });
  
  let lastTime = Date.now();
  const fps = 60;
  const msPF = 1000 / fps;
  function animate() {
    requestAnimationFrame(animate);
    let now = Date.now();
    if (now - lastTime > msPF) {
      lastTime = now;
      renderer.render();
    }
  }
  animate();
  
  setInterval(() => {
    statusText.updateText(
      "s: switch shape, d: toggle deform, r: reset\n" +
      "Shape: " + shapes[currentShapeIndex] + "\n" +
      "Deform: " + (deformEnabled ? "ON" : "OFF") + "\n" +
      "Mouse: " + mouseStatus
    );
  }, 100);
  
  return renderer;
}

init().then(() => {
  console.log("Quest5 scene running...");
}).catch((err) => {
  console.error("Error in quest5:", err);
});
