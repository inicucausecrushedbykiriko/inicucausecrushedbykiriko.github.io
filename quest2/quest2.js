import FilteredRenderer from '/lib/Viz/2DFilteredRenderer.js';
import Standard2DFullScreenObject from '/lib/DSViz/Standard2DFullScreenObject.js';
import Standard2DPGAPosedVertexColorObject from '/lib/DSViz/Standard2DPGAPosedVertexColorObject.js';
import PGA2D from '/lib/Math/PGA2D.js';
import circle from './circle.js'; // Importing the circle generator

import AnimatedOrbitObject from '/lib/DSViz/AnimatedOrbitObject.js';
import AnimatedSpaceshipObject from '/lib/DSViz/AnimatedSpaceshipObject.js';

async function init() {
  // Create canvas
  const canvasTag = document.createElement('canvas');
  canvasTag.id = "renderCanvas";
  document.body.appendChild(canvasTag);

  // Initialize renderer
  const renderer = new FilteredRenderer(canvasTag);
  await renderer.init();

  // 🌌 Space Background
  await renderer.appendSceneObject(new Standard2DFullScreenObject(renderer._device, renderer._canvasFormat, "/assets/space.jpg"));

  // ☀️ Sun (Static at center)
  let sunPose = new Float32Array([1, 0, 0, 0, 1, 1]);
  await renderer.appendSceneObject(new Standard2DPGAPosedVertexColorObject(renderer._device, renderer._canvasFormat, circle(255, 223, 0, 0.2), sunPose));

  // 🪐 Planet orbiting the Sun
  let planetPose = new Float32Array([1, 0, 0.5, 0, 1, 1]);
  await renderer.appendSceneObject(new AnimatedOrbitObject(renderer._device, renderer._canvasFormat, planetPose, 0.1, [0, 0.5, 1]));

  // 🌙 Moon orbiting the planet
  let moonPose = new Float32Array([1, 0, 0.7, 0, 1, 1]);
  await renderer.appendSceneObject(new AnimatedOrbitObject(renderer._device, renderer._canvasFormat, moonPose, 0.05, [0.7, 0.7, 0.7], planetPose));

  // 🚀 Animated Spaceship
  let spaceshipPose = new Float32Array([1, 0, -1, 0, 1, 1]);
  await renderer.appendSceneObject(new AnimatedSpaceshipObject(renderer._device, renderer._canvasFormat, spaceshipPose));

  return renderer;
}

// Initialize the simulation
init().then(ret => {
  console.log(ret);
}).catch(error => {
  const pTag = document.createElement('p');
  pTag.innerHTML = navigator.userAgent + "</br>" + error.message;
  document.body.appendChild(pTag);
  document.getElementById("renderCanvas").remove();
});
