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

import Renderer from '/quest3/lib/Viz/2DRenderer.js';
import Camera from '/quest3/lib/Viz/2DCamera.js';
import CameraLineStrip2DAliveDeadObject from '/quest3/lib/DSViz/CameraLineStrip2DAliveDeadObject.js';
import StandardTextObject from '/quest3/lib/DSViz/StandardTextObject.js';

async function init() {
  const canvasTag = document.createElement('canvas');
  canvasTag.id = "renderCanvas";
  document.body.appendChild(canvasTag);

  const renderer = new Renderer(canvasTag);
  await renderer.init();

  const camera = new Camera();
  const vertices = new Float32Array([
    -0.5, -0.5,
     0.5, -0.5,
     0.5,  0.5,
    -0.5,  0.5,
    -0.5, -0.5
  ]);

  const grid = new CameraLineStrip2DAliveDeadObject(
    renderer._device,
    renderer._canvasFormat,
    camera._pose,
    vertices
  );
  await grid.init();
  await renderer.appendSceneObject(grid);

  // FPS text (top-left)
  let fpsText = new StandardTextObject('fps: ??');

  // Controls text (offset lower to prevent overlap)
  let helpText = new StandardTextObject(
    "Keyboard Controls:\n" +
    "WASD / Arrows - Move camera\n" +
    "Q / E - Zoom in/out\n" +
    "P - Pause  |  R - Reset\n" +
    "F - Toggle FPS\n\n" +
    "PS5 Gamepad Controls:\n" +
    "Left Stick - Move camera\n" +
    "L1 / R1 - Zoom in/out\n" +
    "Triangle - Reset\n" +
    "Options - Pause/Resume"
  );
  helpText._textCanvas.style.top = '80px'; // move down below FPS

  // Pause logic
  let isPaused = false;
  const originalCompute = grid.compute.bind(grid);
  grid.compute = (pass) => {
    if (!isPaused) originalCompute(pass);
  };

  const moveSpeed = 0.05;
  const zoomSpeed = 0.05;

  // Keyboard controls
  window.addEventListener("keydown", (e) => {
    switch (e.key) {
      case 'w': case 'W': case 'ArrowUp':
        camera.moveUp(moveSpeed); break;
      case 's': case 'S': case 'ArrowDown':
        camera.moveDown(moveSpeed); break;
      case 'a': case 'A': case 'ArrowLeft':
        camera.moveLeft(moveSpeed); break;
      case 'd': case 'D': case 'ArrowRight':
        camera.moveRight(moveSpeed); break;
      case 'q': case 'Q':
        camera.zoomIn(); break;
      case 'e': case 'E':
        camera.zoomOut(); break;
      case 'f': case 'F':
        fpsText.toggleVisibility(); return;
      case 'p': case 'P':
        isPaused = !isPaused;
        console.log(`Simulation ${isPaused ? "paused" : "resumed"}`);
        return;
      case 'r': case 'R':
        grid.randomizeCells();
        grid.refreshGPUCellState();
        console.log("Simulation reset.");
        return;
    }
    grid.updateCameraPose();
  });

  // Gamepad logic
  function handleGamepadInput() {
    const gamepads = navigator.getGamepads();
    if (!gamepads) return;

    const gp = gamepads[0];
    if (!gp) return;

    const lx = gp.axes[0]; // left stick horizontal
    const ly = gp.axes[1]; // left stick vertical

    // Dead zone
    if (Math.abs(lx) > 0.1) {
      if (lx < 0) camera.moveLeft(moveSpeed * Math.abs(lx));
      else camera.moveRight(moveSpeed * Math.abs(lx));
    }
    if (Math.abs(ly) > 0.1) {
      if (ly < 0) camera.moveUp(moveSpeed * Math.abs(ly));
      else camera.moveDown(moveSpeed * Math.abs(ly));
    }

    // L1 (button 4) to zoom in, R1 (button 5) to zoom out
    if (gp.buttons[4].pressed) camera.zoomIn();
    if (gp.buttons[5].pressed) camera.zoomOut();

    // Triangle (button 3) to reset
    if (gp.buttons[3].pressed && !handleGamepadInput._resetPressed) {
      grid.randomizeCells();
      grid.refreshGPUCellState();
      console.log("Gamepad: Simulation reset.");
    }
    handleGamepadInput._resetPressed = gp.buttons[3].pressed;

    // Options button (button 9) to pause/resume
    if (gp.buttons[9].pressed && !handleGamepadInput._pausePressed) {
      isPaused = !isPaused;
      console.log(`Gamepad: Simulation ${isPaused ? "paused" : "resumed"}`);
    }
    handleGamepadInput._pausePressed = gp.buttons[9].pressed;

    grid.updateCameraPose();
  }
  handleGamepadInput._pausePressed = false;
  handleGamepadInput._resetPressed = false;

  // Animation loop
  let frameCnt = 0;
  const tgtFPS = 60;
  const frameInterval = 1000 / tgtFPS;
  let lastCalled = Date.now();

  const renderFrame = () => {
    handleGamepadInput(); // poll gamepad every frame

    const elapsed = Date.now() - lastCalled;
    if (elapsed > frameInterval) {
      ++frameCnt;
      lastCalled = Date.now() - (elapsed % frameInterval);
      renderer.render();
    }
    requestAnimationFrame(renderFrame);
  };

  renderFrame();
  setInterval(() => {
    fpsText.updateText('fps: ' + frameCnt);
    frameCnt = 0;
  }, 1000);
}

init().catch(error => {
  const pTag = document.createElement('p');
  pTag.innerHTML = navigator.userAgent + "</br>" + error.message;
  document.body.appendChild(pTag);
  document.getElementById("renderCanvas")?.remove();
});
