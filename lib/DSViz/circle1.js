import Standard2DPGAPosedVertexColorObject from "/lib/DSViz/Standard2DPGAPosedVertexColorObject.js";

export default class AnimatedCelestialObject extends Standard2DPGAPosedVertexColorObject {
  constructor(device, canvasFormat, pose) {
    let vertices = [];
    let numSegments = 36; // Approximate a circle with 36 segments
    let radius = 0.1;
    let color = [0.2, 0.5, 1]; // Blueish planet color

    for (let i = 0; i < numSegments; i++) {
      let angle = (i * 2 * Math.PI) / numSegments;
      vertices.push(radius * Math.cos(angle), radius * Math.sin(angle), color[0], color[1], color[2], 1);
    }

    super(device, canvasFormat, new Float32Array(vertices), pose);

    this._interval = 150;  // Time interval for interpolation
    this._t = 0;
    this._step = 1;

    // Define THREE poses for interpolation
    this._pose0 = [1, 0, -0.6, 0.2, 1, 1]; // Left Position
    this._pose1 = [0, 1, 0.0, -0.4, 1, 1]; // Middle Position
    this._pose2 = [1, 0, 0.6, 0.2, 1, 1];  // Right Position
  }

  updateGeometry() {
    // Determine interpolation phase
    let p0, p1;
    if (this._t < this._interval / 2) {
      p0 = this._pose0;
      p1 = this._pose1;
    } else {
      p0 = this._pose1;
      p1 = this._pose2;
    }

    // Linearly interpolate between poses
    let local_t = (this._t % (this._interval / 2)) / (this._interval / 2);
    this._pose[0] = p0[0] * (1 - local_t) + p1[0] * local_t;
    this._pose[1] = p0[1] * (1 - local_t) + p1[1] * local_t;
    this._pose[2] = p0[2] * (1 - local_t) + p1[2] * local_t;
    this._pose[3] = p0[3] * (1 - local_t) + p1[3] * local_t;

    // Move through phases
    this._t += this._step;
    if (this._t >= this._interval) {
      this._step = -1; // Reverse
    } else if (this._t <= 0) {
      this._step = 1; // Move forward again
    }

    super.updateGeometry();
  }
}
