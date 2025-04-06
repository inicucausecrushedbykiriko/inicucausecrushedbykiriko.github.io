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
import PGA2D from '/quest3/lib/Math/PGA2D.js';

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

  let fpsText = new StandardTextObject('fps: ??');
  let helpText = new StandardTextObject(
    "Keyboard Controls:\n" +
    "WASD / Arrows - Move camera\n" +
    "Q / E - Zoom in/out\n" +
    "P - Pause  |  R - Reset\n" +
    "F - Toggle FPS\n" +
    "1 / 2 - Speed up/down\n" +
    "Use mouse or touch to toggle cell\n\n" +
    "PS5 Gamepad Controls:\n" +
    "Left Stick - Move camera\n" +
    "L1 / R1 - Zoom in/out\n" +
    "L2 / R2 - Speed up/down\n" +
    "Triangle - Reset\n" +
    "Options - Pause/Resume"
  );
  helpText._textCanvas.style.top = '80px';

  let isPaused = false;
  let computeInterval = 1;
  const originalCompute = grid.compute.bind(grid);
  grid.compute = (pass) => {
    if (!isPaused) originalCompute(pass);
  };

  const moveSpeed = 0.05;

  // --- KEYBOARD ---
  window.addEventListener("keydown", (e) => {
    switch (e.key) {
      case 'w': case 'W': case 'ArrowUp': camera.moveUp(moveSpeed); break;
      case 's': case 'S': case 'ArrowDown': camera.moveDown(moveSpeed); break;
      case 'a': case 'A': case 'ArrowLeft': camera.moveLeft(moveSpeed); break;
      case 'd': case 'D': case 'ArrowRight': camera.moveRight(moveSpeed); break;
      case 'q': case 'Q': camera.zoomIn(); break;
      case 'e': case 'E': camera.zoomOut(); break;
      case 'f': case 'F': fpsText.toggleVisibility(); return;
      case 'p': case 'P':
        isPaused = !isPaused;
        console.log(`Simulation ${isPaused ? "paused" : "resumed"}`);
        return;
      case 'r': case 'R':
        grid.randomizeCells();
        grid.refreshGPUCellState();
        console.log("Simulation reset.");
        return;
      case '1': computeInterval = Math.min(10, computeInterval + 0.25); return;
      case '2': computeInterval = Math.max(0.1, computeInterval - 0.25); return;
    }
    grid.updateCameraPose();
  });

  // --- GAMEPAD ---
  function handleGamepadInput() {
    const gp = navigator.getGamepads()[0];
    if (!gp) return;

    const lx = gp.axes[0];
    const ly = gp.axes[1];
    if (Math.abs(lx) > 0.1) (lx < 0 ? camera.moveLeft : camera.moveRight)(moveSpeed * Math.abs(lx));
    if (Math.abs(ly) > 0.1) (ly < 0 ? camera.moveUp : camera.moveDown)(moveSpeed * Math.abs(ly));

    // Map zoom and speed to keyboard sim
    if (gp.buttons[4].pressed) camera.zoomIn();
    if (gp.buttons[5].pressed) camera.zoomOut();
    if (gp.buttons[3].pressed && !handleGamepadInput._resetPressed) {
      grid.randomizeCells(); grid.refreshGPUCellState();
    }
    if (gp.buttons[9].pressed && !handleGamepadInput._pausePressed) isPaused = !isPaused;
    if (gp.buttons[6].pressed && !handleGamepadInput._l2Pressed) computeInterval = Math.min(10, computeInterval + 0.25);
    if (gp.buttons[7].pressed && !handleGamepadInput._r2Pressed) computeInterval = Math.max(0.1, computeInterval - 0.25);

    handleGamepadInput._resetPressed = gp.buttons[3].pressed;
    handleGamepadInput._pausePressed = gp.buttons[9].pressed;
    handleGamepadInput._l2Pressed = gp.buttons[6].pressed;
    handleGamepadInput._r2Pressed = gp.buttons[7].pressed;

    grid.updateCameraPose();
  }
  handleGamepadInput._pausePressed = false;
  handleGamepadInput._resetPressed = false;
  handleGamepadInput._l2Pressed = false;
  handleGamepadInput._r2Pressed = false;

  // --- MOUSE TOGGLE ---
  function toggleCellFromPointer(x, y) {
    const rect = canvasTag.getBoundingClientRect();
    const canvasX = x - rect.left;
    const canvasY = y - rect.top;
    const normalizedX = (canvasX / canvasTag.width) * 2 - 1;
    const normalizedY = -((canvasY / canvasTag.height) * 2 - 1);
    const scaleX = normalizedX / camera._pose[4];
    const scaleY = normalizedY / camera._pose[5];
    const world = PGA2D.applyMotorToPoint([scaleX, scaleY], [camera._pose[0], camera._pose[1], camera._pose[2], camera._pose[3]]);
    const gridX = Math.floor((world[0] + 1) / 2 * 2048);
    const gridY = Math.floor((world[1] + 1) / 2 * 2048);
    if (gridX >= 0 && gridX < 2048 && gridY >= 0 && gridY < 2048) {
      grid.toggleCell(gridX, gridY);
    }
  }
  canvasTag.addEventListener("mousedown", e => toggleCellFromPointer(e.clientX, e.clientY));

  // --- TOUCH: TAP + PINCH ---
  let lastTouchDist = null;
  canvasTag.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      toggleCellFromPointer(t.clientX, t.clientY);
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist = Math.sqrt(dx * dx + dy * dy);
    }
  });

  canvasTag.addEventListener("touchmove", (e) => {
    if (e.touches.length === 2 && lastTouchDist !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.sqrt(dx * dx + dy * dy);
      if (newDist > lastTouchDist + 10) {
        camera.zoomIn();
        grid.updateCameraPose();
      } else if (newDist < lastTouchDist - 10) {
        camera.zoomOut();
        grid.updateCameraPose();
      }
      lastTouchDist = newDist;
    }
  });

  canvasTag.addEventListener("touchend", () => {
    lastTouchDist = null;
  });

  // --- MAIN LOOP ---
  let frameCnt = 0;
  const tgtFPS = 60;
  const frameInterval = 1000 / tgtFPS;
  let lastCalled = Date.now();

  const renderFrame = () => {
    handleGamepadInput();
    const elapsed = Date.now() - lastCalled;
    if (elapsed > frameInterval) {
      ++frameCnt;
      lastCalled = Date.now() - (elapsed % frameInterval);
      if (computeInterval >= 1) {
        for (let i = 0; i < computeInterval; i++) renderer.render();
      } else {
        if ((frameCnt % Math.round(1 / computeInterval)) === 0) renderer.render();
      }
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
