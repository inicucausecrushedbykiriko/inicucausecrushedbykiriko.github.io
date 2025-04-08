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

import RayTracer from '/quest6/lib/Viz/RayTracer.js'
import StandardTextObject from '/quest6/lib/DSViz/StandardTextObject.js'
import RayTracingBoxObject from '/quest6/lib/DSViz/RayTracingBoxObject2.js'
import Camera from '/quest6/lib/Viz/3DCamera2.js'

async function init() {
  const canvasTag = document.createElement('canvas');
  canvasTag.id = "renderCanvas";
  document.body.appendChild(canvasTag);

  const tracer = new RayTracer(canvasTag);
  await tracer.init();

  var camera = new Camera();
  camera._isProjective = false;
  const tracerObj = new RayTracingBoxObject(tracer._device, tracer._canvasFormat, camera);
  await tracer.setTracerObject(tracerObj);

  let fps = '??';
  let fpsText = new StandardTextObject('fps: ' + fps);
  let currentObject = 0; 
  let helpText = new StandardTextObject(
    "Quest6 Raytracing:\n" +
    "T - Change camera mode\n" +
    "W/S/A/D/R/F - Move Camera\n" +
    "Arrows - Rotate Camera\n" +
    "+/- - Adjust Focal (Projective)\n" +
    "I/K/J/L/U/O - Move/Rotate Box or Sphere\n" +
    "1/2/3/4/5/6 - Rotate (Box or Sphere)\n" +
    "Space - Switch Object\n" +
    "Object: Box"
  );
  helpText._textCanvas.style.top = '80px';

  function updateHelpText() {
    let objName = (currentObject === 0) ? "Box" : "Sphere";
    helpText.updateText(
      "Quest6 Raytracing:\n" +
      "T - Change camera mode\n" +
      "W/S/A/D/R/F - Move Camera\n" +
      "Arrows - Rotate Camera\n" +
      "+/- - Adjust Focal (Projective)\n" +
      "I/K/J/L/U/O - Move/Rotate Box or Sphere\n" +
      "1/2/3/4/5/6 - Rotate (Box or Sphere)\n" +
      "Space - Switch Object\n" +
      "Object: " + objName
    );
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'T' || e.key === 't') {
      camera._isProjective = !camera._isProjective;
      updateHelpText();
    }
    if (e.key === 'w' || e.key === 'W') {
      camera.moveZ(0.1);
      tracerObj.updateCameraPose();
    }
    if (e.key === 's' || e.key === 'S') {
      camera.moveZ(-0.1);
      tracerObj.updateCameraPose();
    }
    if (e.key === 'a' || e.key === 'A') {
      camera.moveX(-0.1);
      tracerObj.updateCameraPose();
    }
    if (e.key === 'd' || e.key === 'D') {
      camera.moveX(0.1);
      tracerObj.updateCameraPose();
    }
    if (e.key === 'r' || e.key === 'R') {
      camera.moveY(0.1);
      tracerObj.updateCameraPose();
    }
    if (e.key === 'f' || e.key === 'F') {
      camera.moveY(-0.1);
      tracerObj.updateCameraPose();
    }
    if (e.key === 'ArrowUp') {
      camera.rotateX(-0.1);
      tracerObj.updateCameraPose();
    }
    if (e.key === 'ArrowDown') {
      camera.rotateX(0.1);
      tracerObj.updateCameraPose();
    }
    if (e.key === 'ArrowLeft') {
      camera.rotateY(0.1);
      tracerObj.updateCameraPose();
    }
    if (e.key === 'ArrowRight') {
      camera.rotateY(-0.1);
      tracerObj.updateCameraPose();
    }
    if ((e.key === '+' || e.key === '=') && camera._isProjective) {
      camera._focal[0] *= 1.1;
      camera._focal[1] *= 1.1;
      tracerObj.updateCameraFocal();
    }
    if (e.key === '-' && camera._isProjective) {
      camera._focal[0] /= 1.1;
      camera._focal[1] /= 1.1;
      tracerObj.updateCameraFocal();
    }
    if (e.key === ' ') {
      currentObject = (currentObject === 0) ? 1 : 0;
      updateHelpText();
    }
    let boxPose = tracerObj._box._pose;
    let spherePose = tracerObj._sphere._pose;
    if (e.key === 'i' || e.key === 'I') {
      if (currentObject === 0) {
        boxPose[2] += 0.1;
        tracerObj.updateBoxPose();
      } else {
        spherePose[2] += 0.1;
        tracerObj.updateSpherePose();
      }
    }
    if (e.key === 'k' || e.key === 'K') {
      if (currentObject === 0) {
        boxPose[2] -= 0.1;
        tracerObj.updateBoxPose();
      } else {
        spherePose[2] -= 0.1;
        tracerObj.updateSpherePose();
      }
    }
    if (e.key === 'j' || e.key === 'J') {
      if (currentObject === 0) {
        boxPose[0] -= 0.1;
        tracerObj.updateBoxPose();
      } else {
        spherePose[0] -= 0.1;
        tracerObj.updateSpherePose();
      }
    }
    if (e.key === 'l' || e.key === 'L') {
      if (currentObject === 0) {
        boxPose[0] += 0.1;
        tracerObj.updateBoxPose();
      } else {
        spherePose[0] += 0.1;
        tracerObj.updateSpherePose();
      }
    }
    if (e.key === 'u' || e.key === 'U') {
      if (currentObject === 0) {
        boxPose[1] += 0.1;
        tracerObj.updateBoxPose();
      } else {
        spherePose[1] += 0.1;
        tracerObj.updateSpherePose();
      }
    }
    if (e.key === 'o' || e.key === 'O') {
      if (currentObject === 0) {
        boxPose[1] -= 0.1;
        tracerObj.updateBoxPose();
      } else {
        spherePose[1] -= 0.1;
        tracerObj.updateSpherePose();
      }
    }
    if (e.key === '1') {
      if (currentObject === 0) {
        boxPose[4] += 0.1;
        tracerObj.updateBoxPose();
      } else {
        spherePose[4] += 0.1;
        tracerObj.updateSpherePose();
      }
    }
    if (e.key === '2') {
      if (currentObject === 0) {
        boxPose[4] -= 0.1;
        tracerObj.updateBoxPose();
      } else {
        spherePose[4] -= 0.1;
        tracerObj.updateSpherePose();
      }
    }
    if (e.key === '3') {
      if (currentObject === 0) {
        boxPose[5] += 0.1;
        tracerObj.updateBoxPose();
      } else {
        spherePose[5] += 0.1;
        tracerObj.updateSpherePose();
      }
    }
    if (e.key === '4') {
      if (currentObject === 0) {
        boxPose[5] -= 0.1;
        tracerObj.updateBoxPose();
      } else {
        spherePose[5] -= 0.1;
        tracerObj.updateSpherePose();
      }
    }
    if (e.key === '5') {
      if (currentObject === 0) {
        boxPose[6] += 0.1;
        tracerObj.updateBoxPose();
      } else {
        spherePose[6] += 0.1;
        tracerObj.updateSpherePose();
      }
    }
    if (e.key === '6') {
      if (currentObject === 0) {
        boxPose[6] -= 0.1;
        tracerObj.updateBoxPose();
      } else {
        spherePose[6] -= 0.1;
        tracerObj.updateSpherePose();
      }
    }
  });

  let frameCnt = 0;
  let tgtFPS = 60;
  let secPerFrame = 1. / tgtFPS;
  let frameInterval = secPerFrame * 1000;
  let lastCalled;

  let renderFrame = () => {
    let elapsed = Date.now() - lastCalled;
    if (elapsed > frameInterval) {
      frameCnt++;
      lastCalled = Date.now() - (elapsed % frameInterval);
      tracer.render();
    }
    requestAnimationFrame(renderFrame);
  };

  lastCalled = Date.now();
  renderFrame();

  setInterval(() => {
    fpsText.updateText('fps: ' + frameCnt);
    frameCnt = 0;
  }, 1000);

  return tracer;
}

init().then((ret) => {
  console.log(ret);
}).catch((error) => {
  const pTag = document.createElement('p');
  pTag.innerHTML = navigator.userAgent + "</br>" + error.message;
  document.body.appendChild(pTag);
  document.getElementById("renderCanvas").remove();
});
