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
    "Mouse: Toggle cells | Drag yellow cells\n\n" +
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
      case '1':
        computeInterval = Math.min(10, computeInterval + 0.25);
        console.log(`Simulation speed: ${computeInterval}x`);
        return;
      case '2':
        computeInterval = Math.max(0.1, computeInterval - 0.25);
        console.log(`Simulation speed: ${computeInterval}x`);
        return;
    }
    grid.updateCameraPose();
  });

  function simulateKeyPress(key) {
    window.dispatchEvent(new KeyboardEvent('keydown', { key }));
  }
  
  function handleGamepadInput() {
    const gamepads = navigator.getGamepads();
    if (!gamepads) return;
  
    const gp = gamepads[0];
    if (!gp) return;
  
    const lx = gp.axes[0];
    const ly = gp.axes[1];
  
    // Movement with left stick
    if (Math.abs(lx) > 0.1) {
      if (lx < 0) camera.moveLeft(moveSpeed * Math.abs(lx));
      else camera.moveRight(moveSpeed * Math.abs(lx));
    }
    if (Math.abs(ly) > 0.1) {
      if (ly < 0) camera.moveUp(moveSpeed * Math.abs(ly));
      else camera.moveDown(moveSpeed * Math.abs(ly));
    }
  
    // L1 (button 4) mapped to 'q'
    if (gp.buttons[4].pressed && !handleGamepadInput._l1Pressed) {
      simulateKeyPress('q');
    }
    handleGamepadInput._l1Pressed = gp.buttons[4].pressed;
  
    // R1 (button 5) mapped to 'e'
    if (gp.buttons[5].pressed && !handleGamepadInput._r1Pressed) {
      simulateKeyPress('e');
    }
    handleGamepadInput._r1Pressed = gp.buttons[5].pressed;
  
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
  
    // L2 → speed up = key '1'
    if (gp.buttons[6].pressed && !handleGamepadInput._l2Pressed) {
      simulateKeyPress('1');
    }
    handleGamepadInput._l2Pressed = gp.buttons[6].pressed;
  
    // R2 → slow down = key '2'
    if (gp.buttons[7].pressed && !handleGamepadInput._r2Pressed) {
      simulateKeyPress('2');
    }
    handleGamepadInput._r2Pressed = gp.buttons[7].pressed;
  
    grid.updateCameraPose();
  }

  handleGamepadInput._l1Pressed = false;
  handleGamepadInput._r1Pressed = false;
  handleGamepadInput._l2Pressed = false;
  handleGamepadInput._r2Pressed = false;
  handleGamepadInput._pausePressed = false;
  handleGamepadInput._resetPressed = false;

  // 🖱 Mouse interactions
  let dragging = false;
  let dragIdx = -1;

  canvasTag.addEventListener("mousedown", (e) => {
    const rect = canvasTag.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    const normalizedX = (canvasX / canvasTag.width) * 2 - 1;
    const normalizedY = -((canvasY / canvasTag.height) * 2 - 1);

    const scaleX = normalizedX / camera._pose[4];
    const scaleY = normalizedY / camera._pose[5];

    const world = PGA2D.applyMotorToPoint(
      [scaleX, scaleY],
      [camera._pose[0], camera._pose[1], camera._pose[2], camera._pose[3]]
    );

    const gridX = Math.floor((world[0] + 1) / 2 * 2048);
    const gridY = Math.floor((world[1] + 1) / 2 * 2048);

    if (gridX >= 0 && gridX < 2048 && gridY >= 0 && gridY < 2048) {
      const idx = gridY * 2048 + gridX;
      const val = grid._cellStatus[idx];
      if (val === 3) {
        dragging = true;
        dragIdx = idx;
      } else {
        grid.toggleCell(gridX, gridY);
      }
    }
  });

  canvasTag.addEventListener("mouseup", () => {
    dragging = false;
    dragIdx = -1;
  });

  canvasTag.addEventListener("mousemove", (e) => {
    if (!dragging) return;

    const rect = canvasTag.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    const normalizedX = (canvasX / canvasTag.width) * 2 - 1;
    const normalizedY = -((canvasY / canvasTag.height) * 2 - 1);

    const scaleX = normalizedX / camera._pose[4];
    const scaleY = normalizedY / camera._pose[5];

    const world = PGA2D.applyMotorToPoint(
      [scaleX, scaleY],
      [camera._pose[0], camera._pose[1], camera._pose[2], camera._pose[3]]
    );

    const gridX = Math.floor((world[0] + 1) / 2 * 2048);
    const gridY = Math.floor((world[1] + 1) / 2 * 2048);

    if (gridX >= 0 && gridX < 2048 && gridY >= 0 && gridY < 2048) {
      const newIdx = gridY * 2048 + gridX;
      if (newIdx !== dragIdx) {
        grid._cellStatus[dragIdx] = 0;
        grid._cellStatus[newIdx] = 3;
        dragIdx = newIdx;
        grid.refreshGPUCellState();
      }
    }
  });

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
        for (let i = 0; i < computeInterval; i++) {
          renderer.render();
        }
      } else {
        if ((frameCnt % Math.round(1 / computeInterval)) === 0) {
          renderer.render();
        }
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
