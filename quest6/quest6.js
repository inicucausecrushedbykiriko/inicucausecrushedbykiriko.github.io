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
    "I/K/J/L/U/O - Move/Rotate (selected)\n" +
    "1/2/3/4/5/6 - Rotate (selected)\n" +
    "Space - Switch Object\n" +
    "0=Box,1=Sphere,2=Cylinder,3=Cone,4=Ellipsoid\n" +
    "Object: Box"
  );
  helpText._textCanvas.style.top = '80px';
  function updateHelpText() {
    let objName = "Box";
    if(currentObject===1) objName = "Sphere";
    else if(currentObject===2) objName = "Cylinder";
    else if(currentObject===3) objName = "Cone";
    else if(currentObject===4) objName = "Ellipsoid";
    helpText.updateText(
      "Quest6 Raytracing:\n" +
      "T - Change camera mode\n" +
      "W/S/A/D/R/F - Move Camera\n" +
      "Arrows - Rotate Camera\n" +
      "+/- - Adjust Focal (Projective)\n" +
      "I/K/J/L/U/O - Move/Rotate (selected)\n" +
      "1/2/3/4/5/6 - Rotate (selected)\n" +
      "Space - Switch Object\n" +
      "0=Box,1=Sphere,2=Cylinder,3=Cone,4=Ellipsoid\n" +
      "Object: " + objName
    );
  }
  window.addEventListener('keydown', (e) => {
    if(e.key==='T' || e.key==='t') { camera._isProjective = !camera._isProjective; updateHelpText(); }
    if(e.key==='w' || e.key==='W') { camera.moveZ(0.1); tracerObj.updateCameraPose(); }
    if(e.key==='s' || e.key==='S') { camera.moveZ(-0.1); tracerObj.updateCameraPose(); }
    if(e.key==='a' || e.key==='A') { camera.moveX(-0.1); tracerObj.updateCameraPose(); }
    if(e.key==='d' || e.key==='D') { camera.moveX(0.1); tracerObj.updateCameraPose(); }
    if(e.key==='r' || e.key==='R') { camera.moveY(0.1); tracerObj.updateCameraPose(); }
    if(e.key==='f' || e.key==='F') { camera.moveY(-0.1); tracerObj.updateCameraPose(); }
    if(e.key==='ArrowUp') { camera.rotateX(-0.1); tracerObj.updateCameraPose(); }
    if(e.key==='ArrowDown') { camera.rotateX(0.1); tracerObj.updateCameraPose(); }
    if(e.key==='ArrowLeft') { camera.rotateY(0.1); tracerObj.updateCameraPose(); }
    if(e.key==='ArrowRight') { camera.rotateY(-0.1); tracerObj.updateCameraPose(); }
    if(e.key==='+' || e.key==='=') { if(camera._isProjective){ camera._focal[0]*=1.1; camera._focal[1]*=1.1; tracerObj.updateCameraFocal(); } }
    if(e.key==='-' ) { if(camera._isProjective){ camera._focal[0]/=1.1; camera._focal[1]/=1.1; tracerObj.updateCameraFocal(); } }
    if(e.key===' ') { currentObject = (currentObject+1)%5; updateHelpText(); }
    let boxPose = tracerObj._box._pose;
    let spherePose = tracerObj._sphere._pose;
    let cylPose = tracerObj._cylinder._pose;
    let conePose = tracerObj._cone._pose;
    let ellipPose = tracerObj._ellipsoid._pose;
    function moveSelected(dx, dy, dz) {
      if(currentObject===0) { boxPose[0]+=dx; boxPose[1]+=dy; boxPose[2]+=dz; tracerObj.updateBoxPose(); }
      else if(currentObject===1) { spherePose[0]+=dx; spherePose[1]+=dy; spherePose[2]+=dz; tracerObj.updateSpherePose(); }
      else if(currentObject===2) { cylPose[0]+=dx; cylPose[1]+=dy; cylPose[2]+=dz; tracerObj.updateCylinderPose(); }
      else if(currentObject===3) { conePose[0]+=dx; conePose[1]+=dy; conePose[2]+=dz; tracerObj.updateConePose(); }
      else { ellipPose[0]+=dx; ellipPose[1]+=dy; ellipPose[2]+=dz; tracerObj.updateEllipsoidPose(); }
    }
    if(e.key==='i' || e.key==='I') moveSelected(0,0,0.1);
    if(e.key==='k' || e.key==='K') moveSelected(0,0,-0.1);
    if(e.key==='j' || e.key==='J') moveSelected(-0.1,0,0);
    if(e.key==='l' || e.key==='L') moveSelected(0.1,0,0);
    if(e.key==='u' || e.key==='U') moveSelected(0,0.1,0);
    if(e.key==='o' || e.key==='O') moveSelected(0,-0.1,0);
    function rotateSelected(rx,ry,rz) {
      if(currentObject===0) { boxPose[4]+=rx; boxPose[5]+=ry; boxPose[6]+=rz; tracerObj.updateBoxPose(); }
      else if(currentObject===1) { spherePose[4]+=rx; spherePose[5]+=ry; spherePose[6]+=rz; tracerObj.updateSpherePose(); }
      else if(currentObject===2) { cylPose[4]+=rx; cylPose[5]+=ry; cylPose[6]+=rz; tracerObj.updateCylinderPose(); }
      else if(currentObject===3) { conePose[4]+=rx; conePose[5]+=ry; conePose[6]+=rz; tracerObj.updateConePose(); }
      else { ellipPose[4]+=rx; ellipPose[5]+=ry; ellipPose[6]+=rz; tracerObj.updateEllipsoidPose(); }
    }
    if(e.key==='1') rotateSelected(0.1,0,0);
    if(e.key==='2') rotateSelected(-0.1,0,0);
    if(e.key==='3') rotateSelected(0,0.1,0);
    if(e.key==='4') rotateSelected(0,-0.1,0);
    if(e.key==='5') rotateSelected(0,0,0.1);
    if(e.key==='6') rotateSelected(0,0,-0.1);
  });
  let frameCnt = 0;
  let tgtFPS = 60;
  let secPerFrame = 1/tgtFPS;
  let frameInterval = secPerFrame * 1000;
  let lastCalled;
  let renderFrame = () => {
    let elapsed = Date.now()-lastCalled;
    if(elapsed>frameInterval) {
      frameCnt++;
      lastCalled = Date.now() - (elapsed % frameInterval);
      tracer.render();
    }
    requestAnimationFrame(renderFrame);
  };
  lastCalled = Date.now();
  renderFrame();
  setInterval(() => { fpsText.updateText('fps: ' + frameCnt); frameCnt = 0; }, 1000);
  return tracer;
}
init().then((ret) => { console.log(ret); }).catch((error) => {
  const pTag = document.createElement('p');
  pTag.innerHTML = navigator.userAgent + "</br>" + error.message;
  document.body.appendChild(pTag);
  document.getElementById("renderCanvas").remove();
});
