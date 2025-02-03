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

// Check your browser supports: https://github.com/gpuweb/gpuweb/wiki/Implementation-Status#implementation-status
// Need to enable experimental flags chrome://flags/
// Chrome & Edge 113+ : Enable Vulkan, Default ANGLE Vulkan, Vulkan from ANGLE, Unsafe WebGPU Support, and WebGPU Developer Features (if exsits)
// Firefox Nightly: sudo snap install firefox --channel=latext/edge or download from https://www.mozilla.org/en-US/firefox/channel/desktop/

// quest2-starter.js
import FilteredRenderer from '/lib/Viz/2DFilteredRenderer.js';
import Standard2DFullScreenObject from '/lib/DSViz/Standard2DFullScreenObject.js';
import Standard2DPGAPosedVertexColorObject from '/lib/DSViz/Standard2DPGAPosedVertexColorObject.js';
import DemoTreeObject from '/lib/DSViz/DemoTreeObject.js';
import PGA2D from '/lib/Math/PGA2D.js';
import circleMaker from '/lib/DSViz/circle.js'; // Import the circle function

async function init() {
  // Create a canvas tag
  const canvasTag = document.createElement('canvas');
  canvasTag.id = "renderCanvas";
  document.body.appendChild(canvasTag);
  
  // Create a 2D animated renderer
  const renderer = new FilteredRenderer(canvasTag);
  await renderer.init();
  
  // Create a background
  await renderer.appendSceneObject(
    new Standard2DFullScreenObject(
      renderer._device,
      renderer._canvasFormat,
      "/assets/space.jpg"
    )
  );
  
  // Generate circle geometry (filled red circle)
  // Adjust radius, segments, and color (r, g, b, a) below:
  let circleVertices = circleMaker(0.3, 72, 1, 0, 0, 1);

  // Initialize PGA2D pose
  // The first four entries are the motor (rotation/translation),
  // and the last two might be scale or offset, depending on your pipeline.
  let pose = new Float32Array([1, 0, 0, 0, 1, 1]);

  // Append the circle to the scene, using the same "posed vertex color" object
  await renderer.appendSceneObject(
    new Standard2DPGAPosedVertexColorObject(
      renderer._device,
      renderer._canvasFormat,
      circleVertices,
      pose
    )
  );
  
  // Optionally, also append the DemoTreeObject
  await renderer.appendSceneObject(
    new DemoTreeObject(
      renderer._device,
      renderer._canvasFormat,
      new Float32Array([1, 0, 0, 0, 0.5, 0.5])
    )
  );
  
  // Set up rotation parameters
  let angle = Math.PI / 100;     // how fast to rotate
  let center = [0, 0];           // pivot point
  let dr = PGA2D.normaliozeMotor([
    Math.cos(angle / 2),
    -Math.sin(angle / 2),
    -center[0] * Math.sin(angle / 2),
    -center[1] * Math.sin(angle / 2)
  ]);
  
  // Update & render every 100ms
  setInterval(() => {
    renderer.render();
    // Update the circle's pose by multiplying in the new "delta" motor
    let newmotor = PGA2D.normaliozeMotor(
      PGA2D.geometricProduct(dr, [pose[0], pose[1], pose[2], pose[3]])
    );
    // Replace old motor coefficients with the new ones
    pose[0] = newmotor[0];
    pose[1] = newmotor[1];
    pose[2] = newmotor[2];
    pose[3] = newmotor[3];
  }, 100);
  
  return renderer;
}

// Run `init` and handle potential errors
init().then((ret) => {
  console.log(ret);
}).catch((error) => {
  const pTag = document.createElement('p');
  pTag.innerHTML = navigator.userAgent + "</br>" + error.message;
  document.body.appendChild(pTag);
  document.getElementById("renderCanvas").remove();
});
