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

import RayTracer from '/lib/Viz/RayTracer.js'
import StandardTextObject from '/lib/DSViz/StandardTextObject.js'
import Camera from '/lib/Viz/3DCamera2.js'
import RayTracingTriangleMeshObject from '/lib/DSViz/RayTracingTriangleMeshObject2.js'

async function init() {
  // Create a canvas tag
  const canvasTag = document.createElement('canvas');
  canvasTag.id = "renderCanvas";
  document.body.appendChild(canvasTag);
  // Create a ray tracer
  const tracer = new RayTracer(canvasTag);
  tracer._heightFactor = 0.25; // reduce it if can't run
  await tracer.init();
  // Create a 3D Camera
  var camera = new Camera();
  camera._pose[0] = 4;
  camera._pose[1] = -4;
  camera._pose[2] = 0;
  camera._pose[4] = -Math.PI / 2;
  camera._pose[5] = 0;
  camera._pose[6] = Math.PI / 4;
  camera._focal[0] = 1/4;
  camera._focal[1] = 1/4;
  // Create a triangle mesh object
  var mesh = new RayTracingTriangleMeshObject(tracer._device, tracer._canvasFormat, '/assets/TOSCA/wolf0.ply', camera);
  await tracer.setTracerObject(mesh);
  
  var instuctText = `z/Z: Change Trace Height (XXXXXX)
      [Height Factor: xxxxxxx]
f/F: Show/Hide FPS
h/H: Show/Hide Helper`;
  var instructions = new StandardTextObject(instuctText);
  instuctText = instuctText.replace('XXXXXX', tracer._tgtHeight.toFixed(2));
  instuctText = instuctText.replace('xxxxxxx', tracer._heightFactor.toFixed(2));
  instructions.updateText(instuctText);
  let fps = '??';
  var fpsText = new StandardTextObject('fps: ' + fps);
  
  // keyboard input callback
  window.addEventListener("keydown", async (e) => {
    switch (e.key) {
      case 'h': case 'H': instructions.toggleVisibility(); break;
      case 'f': case 'F': fpsText.toggleVisibility(); break;
      case 'z':
        let oldfactor = tracer._heightFactor.toFixed(2);
        tracer._heightFactor *= 1.1;
        let oldheight = '(' + tracer._tgtHeight.toFixed(2) + ')';
        tracer.resizeCanvas();
        let newheight = '(' + tracer._tgtHeight.toFixed(2) + ')';
        instuctText = instuctText.replace(oldheight, newheight);
        instuctText = instuctText.replace(oldfactor, tracer._heightFactor.toFixed(2));
        instructions.updateText(instuctText);
        break;
      case 'Z':
        let oldFactor = tracer._heightFactor.toFixed(2);
        tracer._heightFactor /= 1.1;
        let oldHeight = '(' + tracer._tgtHeight.toFixed(2) + ')';
        tracer.resizeCanvas();
        let newHeight = '(' + tracer._tgtHeight.toFixed(2) + ')';
        instuctText = instuctText.replace(oldHeight, newHeight);
        instuctText = instuctText.replace(oldFactor, tracer._heightFactor.toFixed(2));
        instructions.updateText(instuctText);
        break;
    }
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
      tracer.render();
    }
    requestAnimationFrame(renderFrame);
  };
  lastCalled = Date.now();
  renderFrame();
  // display fps on console
  fpsText._textCanvas.style.setProperty('left', 'initial');
  fpsText._textCanvas.style.right='10px';
  setInterval(() => { 
    fpsText.updateText('fps: ' + frameCnt);
    frameCnt = 0;
  }, 1000); // call every 1000 ms
  return tracer;
}

init().then( ret => {
  console.log(ret);
}).catch( error => {
  const pTag = document.createElement('p');
  pTag.innerHTML = navigator.userAgent + "</br>" + error.message;
  document.body.appendChild(pTag);
  document.getElementById("renderCanvas").remove();
});
