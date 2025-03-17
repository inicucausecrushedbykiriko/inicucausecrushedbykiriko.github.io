import Standard2DPGAPosedVertexColorObject from "/lib/DSViz/Standard2DPGAPosedVertexColorObject.js";
import PGA2D from '/lib/Math/PGA2D.js';

export default class AnimatedOrbitObject extends Standard2DPGAPosedVertexColorObject {
  constructor(device, canvasFormat, pose, radius, color, parentPose = null) {
    let vertices = circle(color[0] * 255, color[1] * 255, color[2] * 255, radius);
    super(device, canvasFormat, vertices, pose);
    
    this._angleStep = Math.PI / 150;
    this._parentPose = parentPose; // If it's a moon, it follows the parent planet
  }

  updateGeometry() {
    let dr = PGA2D.normaliozeMotor([Math.cos(this._angleStep / 2), -Math.sin(this._angleStep / 2), 0, 0]);

    // Update planetary motion
    let newmotor = PGA2D.normaliozeMotor(PGA2D.geometricProduct(dr, [this._pose[0], this._pose[1], this._pose[2], this._pose[3]]));
    this._pose.set(newmotor);

    // If it's a moon, apply parent motion
    if (this._parentPose) {
      let parentRotation = PGA2D.normaliozeMotor(PGA2D.geometricProduct(dr, [this._parentPose[0], this._parentPose[1], this._parentPose[2], this._parentPose[3]]));
      this._pose[2] += parentRotation[2];
      this._pose[3] += parentRotation[3];
    }

    super.updateGeometry();
  }
}
