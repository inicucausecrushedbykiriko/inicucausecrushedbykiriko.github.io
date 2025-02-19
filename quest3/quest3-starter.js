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

import Renderer from './lib/Viz/2DRenderer.js';
import Camera from './lib/Viz/2DCamera.js';
import CameraLineStrip2DAliveDeadObject from './lib/DSViz/CameraLineStrip2DAliveDeadObject.js';
import StandardTextObject from './lib/DSViz/StandardTextObject.js';
import PGA2D from './lib/Math/PGA2D.js';
import Standard2DPGACameraSceneObject from './lib/DSViz/Standard2DPGACameraSceneObject.js';

async function init() {
  // Create and attach canvas
  const canvasTag = document.createElement('canvas');
  canvasTag.id = "renderCanvas";
  document.body.appendChild(canvasTag);

  // Initialize renderer
  const renderer = new Renderer(canvasTag);
  await renderer.init();

  // Define vertices for a simple shape
  const vertices = new Float32Array([
    -1, -1,  
     1, -1,  
    -1,  1,  
     1, -1,  
    -1,  1,  
     1,  1, 
  ]);

  // Initialize camera and grid
  const camera = new Camera();
  const grid = new CameraLineStrip2DAliveDeadObject(renderer._device, renderer._canvasFormat, camera._pose, vertices);
  await renderer.appendSceneObject(grid);

  // Add FPS text
  let fps = '??';
  const fpsText = new StandardTextObject(`fps: ${fps}\n`);
  fpsText._textCanvas.style.left = "1460px";

  // Keyboard controls
  const movespeed = 0.05;
  window.addEventListener("keydown", (e) => {
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W':  
        camera.moveUp(movespeed);
        break;
      case 'ArrowDown': case 's': case 'S':  
        camera.moveDown(movespeed);
        break;
      case 'ArrowLeft': case 'a': case 'A':  
        camera.moveLeft(movespeed);
        break;
      case 'ArrowRight': case 'd': case 'D':  
        camera.moveRight(movespeed);
        break;
      case 'q': case 'Q':  
        camera.zoomIn();
        break;
      case 'e': case 'E':  
        camera.zoomOut();
        break;
      case 'p': case 'P': grid.togglePause(); break;
      case 'r': case 'R': grid.refreshSimulation(); break;
      case 'z': case 'Z': console.log("Toggle UI visibility (if applicable)"); break;
      case 't': case 'T': grid.toggleRule(); break;
    }
    grid.updateCameraPose();
  });

  // Xbox Controller Input
  const xboxGamepadMapping = () => {
    const gamepads = navigator.getGamepads();
    if (!gamepads || !gamepads[0]) return;

    const gp = gamepads[0];
    if (Math.abs(gp.axes[1]) > 0.1) {
      gp.axes[1] < 0 ? camera.moveUp(movespeed / 8) : camera.moveDown(movespeed / 8);
    }
    if (Math.abs(gp.axes[0]) > 0.1) {
      gp.axes[0] < 0 ? camera.moveLeft(movespeed / 8) : camera.moveRight(movespeed / 8);
    }
    if (gp.buttons[0].pressed) grid.togglePause();
    if (gp.buttons[1].pressed) grid.refreshSimulation();
    if (gp.buttons[2].pressed) camera.zoomIn();
    if (gp.buttons[3].pressed) camera.zoomOut();

    grid.updateCameraPose();
  };

  const gamepadLoop = () => {
    xboxGamepadMapping();
    requestAnimationFrame(gamepadLoop);
  };
  gamepadLoop();

  // Rendering Loop
  let frameCnt = 0;
  const tgtFPS = 60;
  const frameInterval = (1. / tgtFPS) * 1000;
  let lastCalled = Date.now();

  const renderFrame = () => {
    let elapsed = Date.now() - lastCalled;
    if (elapsed > frameInterval) {
      ++frameCnt;
      lastCalled = Date.now() - (elapsed % frameInterval);
      renderer.render();
    }
    requestAnimationFrame(renderFrame);
  };
  renderFrame();

  // FPS Counter
  setInterval(() => { 
    fpsText.updateText(`fps: ${frameCnt}`);
    frameCnt = 0;
  }, 1000);

  return renderer;
}

// Start the application
init().then(console.log).catch(error => {
  document.body.innerHTML = `<p>${navigator.userAgent}</br>${error.message}</p>`;
  document.getElementById("renderCanvas").remove();
});
