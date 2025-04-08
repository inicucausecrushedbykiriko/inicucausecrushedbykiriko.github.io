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

import RayTracer from '/quest8/lib/Viz/RayTracer.js'
import StandardTextObject from '/quest8/lib/DSViz/StandardTextObject.js'
import RayTracingBoxLightObject from '/quest8/lib/DSViz/RayTracingBoxLightObject2.js'
import Camera from '/quest8/lib/Viz/3DCamera2.js'
import PointLight from '/quest8/lib/Viz/PointLight.js'
import DirectionalLight from '/quest8/lib/Viz/DirectionalLight.js'
import SpotLight from '/quest8/lib/Viz/SpotLight.js'

async function init() {
  const canvasTag = document.createElement('canvas');
  canvasTag.id = "renderCanvas";
  document.body.appendChild(canvasTag);
  
  const tracer = new RayTracer(canvasTag);
  await tracer.init();
  
  // Create the camera
  var camera = new Camera();
  camera._pose[4] = -0.25;
  camera._pose[5] = 0.25;
  camera._pose[6] = -0.25;
  
  const tracerObj = new RayTracingBoxLightObject(tracer._device, tracer._canvasFormat, camera);
  await tracer.setTracerObject(tracerObj);

  // FPS text object
  let fps = '??';
  let fpsText = new StandardTextObject('fps: ' + fps);
  fpsText._textCanvas.style.top = '10px';

  // Help text object
  let help = 'Press "t" to change light mode';
  let helpText = new StandardTextObject('Press "t" to change light mode');
  helpText._textCanvas.style.top = '40px';
  // Light mode text object
  let lightMode = 0; // 0 - Point Light, 1 - Directional Light, 2 - SpotLight
  let lightText = new StandardTextObject('Light Mode: Point Light');
  lightText._textCanvas.style.top = '70px';
  
  let light = new PointLight();
  tracerObj.updateLight(light);

  document.addEventListener('keydown', (e) => {
    if (e.key === 't') {
      lightMode = (lightMode + 1) % 3; // Cycle through light modes
      switch (lightMode) {
        case 0:
          light = new PointLight();
          lightText.updateText('Light Mode: Point Light');
          break;
        case 1:
          light = new DirectionalLight();
          lightText.updateText('Light Mode: Directional Light');
          break;
        case 2:
          light = new SpotLight();
          lightText.updateText('Light Mode: Spot Light');
          break;
      }
      tracerObj.updateLight(light);
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
      ++frameCnt;
      lastCalled = Date.now() - (elapsed % frameInterval);
      tracer.render();
    }
    requestAnimationFrame(renderFrame);
  };

  lastCalled = Date.now();
  renderFrame();

  // Update FPS every second
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
