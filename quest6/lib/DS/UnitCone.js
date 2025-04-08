export default class UnitCone {
    constructor() {
      // Right circular cone aligned to local z-axis
      this._pose = new Float32Array(8).fill(0);
      // scale.x => radius at base, scale.y => radius at base, scale.z => height
      this._scales = new Float32Array([0.25, 0.25, 0.5, 1]);
    }
    updatePose(newPose) {
      for (let i = 0; i < 8; ++i) this._pose[i] = newPose[i];
    }
  }
  