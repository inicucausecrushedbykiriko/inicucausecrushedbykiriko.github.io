export default class UnitEllipsoid {
  constructor() {
    this._pose = new Float32Array(8).fill(0);
    this._scales = new Float32Array([0.4, 0.2, 0.6, 1]);
  }
  updatePose(newPose) {
    for (let i = 0; i < 8; ++i) this._pose[i] = newPose[i];
  }
}
