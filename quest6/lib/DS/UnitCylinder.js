export default class UnitCylinder {
  constructor() {
    // We store a pose [pos.x, pos.y, pos.z, dummy, rot.x, rot.y, rot.z, dummy]
    this._pose = new Float32Array(8).fill(0);
    // We store scale as [radiusX, halfHeightY, radiusZ, 1]
    // By default, let's use radius=0.3, halfHeight=0.5
    this._scales = new Float32Array([0.3, 0.5, 0.3, 1]);
  }

  updatePose(newPose) {
    for (let i = 0; i < 8; ++i) this._pose[i] = newPose[i];
  }
}
