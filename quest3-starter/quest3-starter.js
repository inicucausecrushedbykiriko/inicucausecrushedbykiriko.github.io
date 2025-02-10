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

import Renderer from '/lib/Viz/2DRenderer.js'
import Camera from '/lib/Viz/2DCamera.js'
import CameraLineStrip2DAliveDeadObject from '/lib/DSViz/CameraLineStrip2DAliveDeadObject.js'
import StandardTextObject from '/lib/DSViz/StandardTextObject.js'
import PGA2D from '/lib/Math/PGA2D.js'
import Standard2DPGACameraSceneObject from '/lib/DSViz/Standard2DPGACameraSceneObject.js'

async function init() {
  // Create a canvas tag
  const canvasTag = document.createElement('canvas');
  canvasTag.id = "renderCanvas";
  document.body.appendChild(canvasTag);
  // Create a 2d animated renderer
  const renderer = new Renderer(canvasTag);
  await renderer.init();
  var vertices = new Float32Array([
     // x, y
     -0.5, -0.5,
     0.5, -0.5,
     0.5,  0.5,
     -0.5, 0.5, 
     -0.5, -0.5 // loop back to the first vertex
  ]);
  const camera = new Camera();
  const grid = new CameraLineStrip2DAliveDeadObject(renderer._device, renderer._canvasFormat, camera._pose, vertices);
  await renderer.appendSceneObject(grid);
  // Add a movable colored quad
  var pose = new Float32Array([1, 0, 0, 0, 0.025, 0.025]);
  var quadVertices = new Float32Array([
     // x, y, r, g, b, a
     -1, -1, 1, 0, 0, 1,
     1, -1, 0, 1, 0, 1,
     -1, 1, 0, 0, 1, 1,
     1, 1, 1, 0, 1, 1,
     -1, 1, 0, 0, 1, 1,
     1, -1, 0, 1, 0, 1
  ]);
  const quad = new Standard2DPGACameraSceneObject(renderer._device, renderer._canvasFormat, camera._pose, quadVertices, pose);
  await renderer.appendSceneObject(quad);
  let fps = '??';
  var fpsText = new StandardTextObject('fps: ' + fps);
  // keyboard interaction
  var movespeed = 0.05;
  window.addEventListener("keydown", (e) => {
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W':
        camera.moveUp(movespeed);
        grid.updateCameraPose();
        quad.updateCameraPose();
        break;
      case 'ArrowDown': case 's': case 'S':   
        camera.moveDown(movespeed);
        grid.updateCameraPose();     
        quad.updateCameraPose();
        break;
      case 'ArrowLeft': case 'a': case 'A':  
        camera.moveLeft(movespeed);
        grid.updateCameraPose();
        quad.updateCameraPose();
        break;
      case 'ArrowRight': case 'd': case 'D': 
        camera.moveRight(movespeed);
        grid.updateCameraPose();    
        quad.updateCameraPose();        
        break;
      case 'q': case 'Q':  
        camera.zoomIn();
        grid.updateCameraPose();    
        quad.updateCameraPose();        
        break;
      case 'e': case 'E':
        camera.zoomOut();
        grid.updateCameraPose();  
        quad.updateCameraPose();
        break;
      case 'f': case 'F': fpsText.toggleVisibility(); break;
    }
  });
  // mouse interactions
  let isDragging = false;
  let oldP = [0, 0];
  canvasTag.addEventListener('mousedown', (e) => {
    var mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    var mouseY = (-e.clientY / window.innerHeight) * 2 + 1;
    mouseX /= camera._pose[4];
    mouseY /= camera._pose[5];
    let p = PGA2D.applyMotorToPoint([mouseX, mouseY], [camera._pose[0], camera._pose[1], camera._pose[2], camera._pose[3]]);
    oldP = [...p];
    p[0] /= pose[4];
    p[1] /= pose[5];
    let sp = PGA2D.applyMotorToPoint(p, PGA2D.reverse([pose[0], pose[1], pose[2], pose[3]]));
    if (-1 <= sp[0] && sp[0] <= 1 && -1 <= sp[1] && sp[1] <= 1) {
      isDragging = true;
    }
  });
  canvasTag.addEventListener('mousemove', (e) => {
    var mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    var mouseY = (-e.clientY / window.innerHeight) * 2 + 1;
    mouseX /= camera._pose[4];
    mouseY /= camera._pose[5];
    let p = PGA2D.applyMotorToPoint([mouseX, mouseY], [camera._pose[0], camera._pose[1], camera._pose[2], camera._pose[3]]);
    let halfLength = 1; // half cell length
    let cellLength = halfLength * 2; // full cell length
    let u = Math.floor((p[0] + halfLength) / cellLength * 10);
    let v = Math.floor((p[1] + halfLength) / cellLength * 10);
    if (u >= 0 && u < 10 && v >= 0 && v < 10) {
      let offsetX = - halfLength + u / 10 * cellLength + cellLength / 10 * 0.5;
      let offsetY = - halfLength + v / 10 * cellLength + cellLength / 10 * 0.5;
      if (-0.5 / 10 + offsetX <= p[0] && p[0] <= 0.5 / 10 + offsetX && -0.5 / 10 + offsetY <= p[1] && p[1] <= 0.5 / 10 + offsetY) {
        console.log(`in cell (${u}, ${v})`);
      }
    }
    if (isDragging) {
      let diff = Math.sqrt(Math.pow(p[0] - oldP[0], 2) + Math.pow(p[1] - oldP[1], 2));
      if (diff > 0.001) { // a dirty flag spell
        let dt = PGA2D.createTranslator((p[0] - oldP[0]) / pose[4], (p[1] - oldP[1]) / pose[5]); // compute changes in the model space
        let newmotor = PGA2D.normaliozeMotor(PGA2D.geometricProduct(dt, [pose[0], pose[1], pose[2], pose[3]]));
        pose[0] = newmotor[0];
        pose[1] = newmotor[1];
        pose[2] = newmotor[2];
        pose[3] = newmotor[3];
        quad.updateGeometry();
        oldP = p;
      }
    }
  });
  canvasTag.addEventListener('mouseup', (e) => {
    isDragging = false;
  });
  // run animation at 60 fps
  var frameCnt = 0;
  var tgtFPS = 60;
  var secPerFrame = 1. / tgtFPS;
  var frameInterval = secPerFrame * 1000;
  var lastCalled;
  let renderFrame = () => {
    let elapsed = Date.now() - lastCalled;
    if (elapsed > frameInterval) {
      ++frameCnt;
      lastCalled = Date.now() - (elapsed % frameInterval);
      renderer.render();
    }
    requestAnimationFrame(renderFrame);
  };
  lastCalled = Date.now();
  renderFrame();
  setInterval(() => { 
    fpsText.updateText('fps: ' + frameCnt);
    frameCnt = 0;
  }, 1000); // call every 1000 ms
  return renderer;
}

init().then( ret => {
  console.log(ret);
}).catch( error => {
  const pTag = document.createElement('p');
  pTag.innerHTML = navigator.userAgent + "</br>" + error.message;
  document.body.appendChild(pTag);
  document.getElementById("renderCanvas").remove();
});