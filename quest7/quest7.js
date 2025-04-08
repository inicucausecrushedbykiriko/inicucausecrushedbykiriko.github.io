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

import RayTracer from '/quest7/lib/Viz/RayTracer.js'
import StandardTextObject from '/quest7/lib/DSViz/StandardTextObject.js'
import VolumeRenderingSimpleObject from '/quest7/lib/DSViz/VolumeRenderingSimpleObject2.js'
import Camera from '/quest7/lib/Viz/3DCamera2.js'

let tracer, tracerObj;
let mode = 0;

async function loadScene() {
  const camera = new Camera();
  camera._isProjective = true;
  tracerObj = new VolumeRenderingSimpleObject(tracer._device, tracer._canvasFormat, camera, mode);
  await tracer.setTracerObject(tracerObj);
}

async function init() {
  const canvasTag = document.createElement('canvas');
  canvasTag.id = "renderCanvas";
  document.body.appendChild(canvasTag);
  tracer = new RayTracer(canvasTag);
  await tracer.init();
  await loadScene();
  let helpText = new StandardTextObject(
    "Keys:\n" +
    "W/S A/D R/F Move\n" +
    "Arrows Rotate\n" +
    "+/- Focal\n" +
    "1=PD 2=T1 3=T2 4=Proc"
  );
  window.addEventListener('keydown', (e) => {
    if (!tracerObj) return;
    const cam = tracerObj._camera;
    if (e.key === 'w' || e.key === 'W') { cam.moveZ(-0.1); tracerObj.updateCameraPose(); }
    if (e.key === 's' || e.key === 'S') { cam.moveZ(0.1); tracerObj.updateCameraPose(); }
    if (e.key === 'a' || e.key === 'A') { cam.moveX(-0.1); tracerObj.updateCameraPose(); }
    if (e.key === 'd' || e.key === 'D') { cam.moveX(0.1); tracerObj.updateCameraPose(); }
    if (e.key === 'r' || e.key === 'R') { cam.moveY(0.1); tracerObj.updateCameraPose(); }
    if (e.key === 'f' || e.key === 'F') { cam.moveY(-0.1); tracerObj.updateCameraPose(); }
    if (e.key === 'ArrowUp') { cam.rotateX(-0.1); tracerObj.updateCameraPose(); }
    if (e.key === 'ArrowDown') { cam.rotateX(0.1); tracerObj.updateCameraPose(); }
    if (e.key === 'ArrowLeft') { cam.rotateY(0.1); tracerObj.updateCameraPose(); }
    if (e.key === 'ArrowRight') { cam.rotateY(-0.1); tracerObj.updateCameraPose(); }
    if (e.key === '+' || e.key === '=') { cam._focal[0] *= 1.1; cam._focal[1] *= 1.1; tracerObj.updateCameraFocal(); }
    if (e.key === '-') { cam._focal[0] /= 1.1; cam._focal[1] /= 1.1; tracerObj.updateCameraFocal(); }
    if (e.key === '1') { mode = 0; loadScene(); }
    if (e.key === '2') { mode = 1; loadScene(); }
    if (e.key === '3') { mode = 2; loadScene(); }
    if (e.key === '4') { mode = 3; loadScene(); }
  });
  let frameCnt = 0;
  let tgtFPS = 60;
  let secPerFrame = 1 / tgtFPS;
  let frameInterval = secPerFrame * 1000;
  let lastCalled = Date.now();
  let renderFrame = () => {
    let elapsed = Date.now() - lastCalled;
    if (elapsed > frameInterval) {
      frameCnt++;
      lastCalled = Date.now() - (elapsed % frameInterval);
      tracer.render();
    }
    requestAnimationFrame(renderFrame);
  };
  renderFrame();
  setInterval(() => { frameCnt = 0; }, 1000);
  return tracer;
}

init().then(ret => { console.log(ret); }).catch(error => {
  const pTag = document.createElement('p');
  pTag.innerHTML = navigator.userAgent + "</br>" + error.message;
  document.body.appendChild(pTag);
  document.getElementById("renderCanvas").remove();
});
