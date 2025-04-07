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

import RayTracer from '/quest6/lib/Viz/RayTracer.js'
import StandardTextObject from '/quest6/lib/DSViz/StandardTextObject.js'
import RayTracingBoxObject from '/quest6/lib/DSViz/RayTracingBoxObject2.js'
import Camera from '/quest6/lib/Viz/3DCamera2.js'

async function init() {
  const canvasTag = document.createElement('canvas');
  canvasTag.id = "renderCanvas";
  document.body.appendChild(canvasTag);
  // Pass the canvas width and height into the camera constructor.
  const camera = new Camera(canvasTag.width, canvasTag.height);
  const tracer = new RayTracer(canvasTag);
  await tracer.init();
  const tracerObj = new RayTracingBoxObject(tracer._device, tracer._canvasFormat, camera);
  await tracer.setTracerObject(tracerObj);
  
  const fpsText = new StandardTextObject('fps: ??');
  // Create an instructions/info text box.
  const infoText = new StandardTextObject(
    "Controls:\n" +
    "W: forward\nA: left\nS: back\nD: right\n" +
    "Space: up\nControl: down\n" +
    "Arrow Up/Down: rotate X\nArrow Left/Right: rotate Y\n" +
    "Q/E: rotate Z\nT: toggle camera mode\n" +
    "- /=: change focal X\n[ / ]: change focal Y\n" +
    "U: toggle camera/object"
  );
  infoText._textCanvas.style.left = '1000px';
  
  let controllingCamera = true;
  const moveSpeed = 0.05;
  const rotateSpeed = 2 * Math.PI / 180;
  const focalDelta = 0.1;
  document.addEventListener('keydown', (ev) => {
    const target = controllingCamera ? camera : tracerObj;
    switch(ev.key) {
      case 'w': case 'W': target.moveZ(moveSpeed); break;
      case 's': case 'S': target.moveZ(-moveSpeed); break;
      case 'a': case 'A': target.moveX(-moveSpeed); break;
      case 'd': case 'D': target.moveX(moveSpeed); break;
      case ' ': target.moveY(moveSpeed); break;
      case 'Control': case 'ControlLeft': case 'ControlRight': target.moveY(-moveSpeed); break;
      case 'q': case 'Q': target.rotateZ(rotateSpeed); break;
      case 'e': case 'E': target.rotateZ(-rotateSpeed); break;
      case 'ArrowUp': target.rotateX(-rotateSpeed); break;
      case 'ArrowDown': target.rotateX(rotateSpeed); break;
      case 'ArrowLeft': target.rotateY(rotateSpeed); break;
      case 'ArrowRight': target.rotateY(-rotateSpeed); break;
      case 't': case 'T': camera._isProjective = !camera._isProjective; break;
      case '-': camera.changeFocalX(focalDelta); tracerObj.updateCameraFocal(); break;
      case '=': camera.changeFocalX(-focalDelta); tracerObj.updateCameraFocal(); break;
      case '[': camera.changeFocalY(focalDelta); tracerObj.updateCameraFocal(); break;
      case ']': camera.changeFocalY(-focalDelta); tracerObj.updateCameraFocal(); break;
      case 'u': case 'U': controllingCamera = !controllingCamera; break;
    }
    tracerObj.updateCameraPose();
    tracerObj.updateBoxPose();
  });
  
  let frameCnt = 0;
  let lastCalled = Date.now();
  function renderFrame() {
    let elapsed = Date.now() - lastCalled;
    if (elapsed > 16) {
      frameCnt++;
      lastCalled = Date.now() - (elapsed % 16);
      tracer.render();
    }
    requestAnimationFrame(renderFrame);
  }
  renderFrame();
  setInterval(() => {
    fpsText.updateText('fps: ' + frameCnt);
    frameCnt = 0;
  }, 1000);
  return tracer;
}

init().then(ret => { console.log(ret); })
  .catch(error => {
    const pTag = document.createElement('p');
    pTag.innerHTML = navigator.userAgent + "</br>" + error.message;
    document.body.appendChild(pTag);
    document.getElementById("renderCanvas").remove();
  });
