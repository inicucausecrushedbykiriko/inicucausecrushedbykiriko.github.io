import Standard2DPGAPosedVertexColorObject from "/lib/DSViz/Standard2DPGAPosedVertexColorObject.js";
import PGA2D from '/lib/Math/PGA2D.js';

export default class AnimatedSpaceshipObject extends Standard2DPGAPosedVertexColorObject {
  constructor(device, canvasFormat, pose) {
    let vertices = circle(255, 255, 255, 0.05);
    super(device, canvasFormat, vertices, pose);

    this._orbitTime = 0;
  }

  updateGeometry() {
    this._orbitTime += 0.01;

    // Elliptical orbit motion
    this._pose[2] = 1.5 * Math.cos(this._orbitTime);
    this._pose[3] = 0.8 * Math.sin(this._orbitTime);

    super.updateGeometry();
  }
}
