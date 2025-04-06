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

import Renderer from '/quest4/lib/Viz/2DRenderer.js';
import ParticleSystemObject from '/quest4/lib/DSViz/ParticleSystemObject.js';
import StandardTextObject from '/quest4/lib/DSViz/StandardTextObject.js';

async function init() {
  // Create a canvas tag
  const canvasTag = document.createElement('canvas');
  canvasTag.id = "renderCanvas";
  document.body.appendChild(canvasTag);

  // Create a 2D renderer
  const renderer = new Renderer(canvasTag);
  await renderer.init();

  // Create and append our ParticleSystemObject (4096 is a nice default)
  const particles = new ParticleSystemObject(renderer._device, renderer._canvasFormat, 4096);
  await renderer.appendSceneObject(particles);

  // Text overlay for FPS
  let fps = '??';
  const fpsText = new StandardTextObject('fps: ' + fps);

  // A separate text box with usage instructions
  const infoText = new StandardTextObject(
    "Controls:\n" +
    "W => Decrease gravity\n" +
    "S => Increase gravity\n" +
    "Left-click => Attract to mouse\n" +
    "R => Reset particles\n" +
    "F => Toggle FPS overlay",
    2, // spacing between lines (if desired)
    '16px Arial' // slightly smaller/larger font if you want
  );
  // Shift it down from the fps overlay a bit
  infoText._textCanvas.style.top = '80px';
  infoText._textCanvas.style.left = '10px';

  // Keyboard shortcuts
  window.addEventListener("keydown", (e) => {
    switch (e.key) {
      case 'r':
      case 'R':
        // Respawn all particles on CPU, then update GPU
        particles.resetParticles();
        console.log("Particles reset!");
        break;
      case 'f':
      case 'F':
        // Toggle FPS overlay
        fpsText.toggleVisibility();
        break;
      case 'w':
      case 'W':
        // Lower gravity by 0.1
        particles.modifyGravity(-0.1);
        console.log("Gravity scale decreased!");
        break;
      case 's':
      case 'S':
        // Increase gravity by 0.1
        particles.modifyGravity(+0.1);
        console.log("Gravity scale increased!");
        break;
    }
  });

  // Mouse interaction => hold left-click => attract particles to mouse
  canvasTag.addEventListener('mousedown', (ev) => {
    if (ev.button === 0) {
      particles.setMouseActive(true);
    }
  });
  canvasTag.addEventListener('mouseup', (ev) => {
    if (ev.button === 0) {
      particles.setMouseActive(false);
    }
  });
  canvasTag.addEventListener('mousemove', (ev) => {
    const rect = canvasTag.getBoundingClientRect();
    const x = (ev.clientX - rect.left) / rect.width;
    const y = (ev.clientY - rect.top) / rect.height;
    // Convert [0..1] => [-1..1], [0..1] => [1..-1]
    const nx = x * 2.0 - 1.0;
    const ny = -(y * 2.0 - 1.0);
    particles.setMousePosition(nx, ny);
  });

  // Render at ~60 fps
  let frameCnt = 0;
  const tgtFPS = 60;
  const frameInterval = 1000 / tgtFPS; 
  let lastCalled = Date.now();

  function renderFrame() {
    let elapsed = Date.now() - lastCalled;
    if (elapsed > frameInterval) {
      frameCnt++;
      lastCalled = Date.now() - (elapsed % frameInterval);
      renderer.render();
    }
    requestAnimationFrame(renderFrame);
  }
  renderFrame();

  // Update the FPS overlay every 1s
  setInterval(() => {
    fpsText.updateText('fps: ' + frameCnt);
    frameCnt = 0;
  }, 1000);

  return renderer;
}

init().then((ret) => {
  console.log("Renderer initialized:", ret);
}).catch((error) => {
  const pTag = document.createElement('p');
  pTag.innerHTML = navigator.userAgent + "</br>" + error.message;
  document.body.appendChild(pTag);
  const canvas = document.getElementById("renderCanvas");
  if (canvas) canvas.remove();
});
