export default class UnitCone {
  constructor() {
    // Pose: [pos.x, pos.y, pos.z, dummy, rot.x, rot.y, rot.z, dummy]
    this._pose = new Float32Array(8).fill(0);
    // Scale: [radius, halfHeight, unused, 1]
    // Use default radius = 0.3 and halfHeight = 0.5
    this._scales = new Float32Array([0.3, 0.5, 1.0, 1.0]);
  }
  
  updatePose(newPose) {
    for (let i = 0; i < 8; ++i) this._pose[i] = newPose[i];
  }
}
