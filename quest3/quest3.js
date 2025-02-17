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

import Renderer2D from './lib/Viz/2DRenderer.js';
import Camera2D from './lib/Viz/2DCamera.js';
import DynamicGrid from './lib/DSViz/CameraLineStrip2DAliveDeadObject.js';
import TextOverlay from './lib/DSViz/StandardTextObject.js';
import PGA2DMath from './lib/Math/PGA2D.js';
import SceneObject2D from './lib/DSViz/Standard2DPGACameraSceneObject.js';

async function initializeScene() {
  // Setup canvas
  const canvasElement = document.createElement('canvas');
  canvasElement.id = "viewportCanvas";
  document.body.appendChild(canvasElement);

  // Renderer initialization
  const graphicsRenderer = new Renderer2D(canvasElement);
  await graphicsRenderer.init();

  // Define grid vertices
  const gridVertices = new Float32Array([
    -1, -1,  1, -1,  -1,  1,
     1, -1, -1,  1,   1,  1, 
  ]);

  // Initialize camera and grid
  const sceneCamera = new Camera2D();
  const simulationGrid = new DynamicGrid(graphicsRenderer._device, graphicsRenderer._canvasFormat, sceneCamera._pose, gridVertices);
  await graphicsRenderer.appendSceneObject(simulationGrid);

  // FPS Display
  let currentFPS = '??';
  const fpsCounter = new TextOverlay(`FPS: ${currentFPS}\n`);
  fpsCounter._textCanvas.style.left = "1460px";

  // Keyboard Controls
  const movementSpeed = 0.05;
  window.addEventListener("keydown", (event) => {
    switch (event.key.toLowerCase()) {
      case 'w': case 'arrowup': sceneCamera.moveUp(movementSpeed); break;
      case 's': case 'arrowdown': sceneCamera.moveDown(movementSpeed); break;
      case 'a': case 'arrowleft': sceneCamera.moveLeft(movementSpeed); break;
      case 'd': case 'arrowright': sceneCamera.moveRight(movementSpeed); break;
      case 'q': sceneCamera.zoomIn(); break;
      case 'e': sceneCamera.zoomOut(); break;
      case 'p': simulationGrid.togglePause(); break;
      case 'r': simulationGrid.resetSimulation(); break;
      case 't': simulationGrid.toggleRule(); break;
    }
    simulationGrid.refreshCamera();
  });

  // Gamepad Support
  function handleGamepadInput() {
    const controllers = navigator.getGamepads();
    if (!controllers || !controllers[0]) return;

    const controller = controllers[0];

    if (Math.abs(controller.axes[1]) > 0.1) {
      controller.axes[1] < 0 ? sceneCamera.moveUp(movementSpeed / 8) : sceneCamera.moveDown(movementSpeed / 8);
    }
    if (Math.abs(controller.axes[0]) > 0.1) {
      controller.axes[0] < 0 ? sceneCamera.moveLeft(movementSpeed / 8) : sceneCamera.moveRight(movementSpeed / 8);
    }
    if (controller.buttons[0].pressed) simulationGrid.togglePause();
    if (controller.buttons[1].pressed) simulationGrid.resetSimulation();
    if (controller.buttons[2].pressed) sceneCamera.zoomIn();
    if (controller.buttons[3].pressed) sceneCamera.zoomOut();

    simulationGrid.refreshCamera();
  }

  function gamepadLoop() {
    handleGamepadInput();
    requestAnimationFrame(gamepadLoop);
  }
  gamepadLoop();

  // Rendering Loop
  let frameCount = 0;
  const targetFPS = 60;
  const frameInterval = (1. / targetFPS) * 1000;
  let previousTimestamp = Date.now();

  function renderScene() {
    let elapsedTime = Date.now() - previousTimestamp;
    if (elapsedTime > frameInterval) {
      frameCount++;
      previousTimestamp = Date.now() - (elapsedTime % frameInterval);
      graphicsRenderer.render();
    }
    requestAnimationFrame(renderScene);
  }
  renderScene();

  // FPS Counter Update
  setInterval(() => { 
    fpsCounter.updateText(`FPS: ${frameCount}`);
    frameCount = 0;
  }, 1000);

  return graphicsRenderer;
}

// Start Application
initializeScene().then(console.log).catch(error => {
  document.body.innerHTML = `<p>${navigator.userAgent}</br>${error.message}</p>`;
  document.getElementById("viewportCanvas").remove();
});
