export default class UnitSphere {
    constructor() {
      this._pose = new Float32Array(8).fill(0);
      this._scales = new Float32Array([0.5, 0.5, 0.5, 1]); // x/y/z radius = 0.25
    }
  
    updatePose(newPose) {
      for (let i = 0; i < 8; ++i) this._pose[i] = newPose[i];
    }
  }
  