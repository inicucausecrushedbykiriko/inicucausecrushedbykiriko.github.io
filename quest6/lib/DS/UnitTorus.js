export default class UnitTorus {
    constructor() {
      this._pose = new Float32Array(8).fill(0);
      // scale.x => major radius (distance from center of the hole to center of tube)
      // scale.y => minor radius (tube's radius)
      this._scales = new Float32Array([0.5, 0.15, 0.0, 1]);
    }
    updatePose(newPose) {
      for (let i = 0; i < 8; ++i) this._pose[i] = newPose[i];
    }
  }
  