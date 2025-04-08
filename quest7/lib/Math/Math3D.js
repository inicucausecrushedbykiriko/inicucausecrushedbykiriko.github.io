/*!
 * Copyright (c) 2025 SingChun LEE @ Bucknell University. CC BY-NC 4.0.
 * 
 * This code is provided mainly for educational purposes at Bucknell University.
 *
 * This code is licensed under the Creative Commons Attribution-NonCommerical 4.0
 * International License. To view a copy of the license, visit 
 *   https://creativecommons.org/licenses/by-nc/4.0/
 * or send a letter to Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
 *
 * You are free to:
 *  - Share: copy and redistribute the material in any medium or format.
 *  - Adapt: remix, transform, and build upon the material.
 *
 * Under the following terms:
 *  - Attribution: You must give appropriate credit, provide a link to the license,
 *                 and indicate if changes where made.
 *  - NonCommerical: You may not use the material for commerical purposes.
 *  - No additional restrictions: You may not apply legal terms or technological 
 *                                measures that legally restrict others from doing
 *                                anything the license permits.
 */

export default class Math3D {
  // pose is always [pos x, pos y, pos z, angle x, angle y, angle z]
  
  // this function translates a 3d point by (dx, dy, dz)
  static translate(pt, dx = 0, dy = 0, dz = 0) {
    return [pt[0] + dx, pt[1] + dy, pt[2] + dz];
  }

  // this function rotates a 3d point along the x/y/z-axis for angle
  // axis is either 0, 1, or 2 for x-axis, y-axis, or z-axis
  // angle is in rad
  static rotate(pt, axis, angle) {
    let c = Math.cos(angle);
    let s = Math.sin(angle);
    switch (axis) {
      case 0: // x-axis
        // y'=ycosθ−zsinθ, z'=ysinθ+zcosθ
        return [pt[0], pt[1] * c - pt[2] * s, pt[1] * s + pt[2] * c];
      case 1: // y-axis
        // x'=xcosθ+zsinθ, z'=−xsinθ+zcosθ
        return [pt[0] * c + pt[2] * s, pt[1], -pt[0] * s + pt[2] * c];
      case 2: // z-axis
        // x'=xcosθ−ysinθ, y'=xsinθ+ycosθ
        return [pt[0] * c - pt[1] * s, pt[0] * s + pt[1] * c, pt[2]];
      default:
        return pt;
    }
  }
  
  // this function applies a pose to transform a point
  static applyPoseToPoint(pt, pose) {
    pt = Math3D.rotate(pt, 0, pose[4]);
    pt = Math3D.rotate(pt, 1, pose[5]);
    pt = Math3D.rotate(pt, 2, pose[6]);
    pt = Math3D.translate(pt, pose[0], pose[1], pose[2]);
    return pt;
  }
  
  // this function applies a pose to transform a direction
  static applyPoseToDir(dir, pose) {
    dir = Math3D.rotate(dir, 0, pose[4]);
    dir = Math3D.rotate(dir, 1, pose[5]);
    dir = Math3D.rotate(dir, 2, pose[6]);
    return dir;
  }
  
  // this function applies a reverse pose to transform a point
  static applyPoseToPoint(pt, pose) {
    pt = Math3D.translate(pt, -pose[0], -pose[1], -pose[2]);
    pt = Math3D.rotate(pt, 2, -pose[6]);
    pt = Math3D.rotate(pt, 1, -pose[5]);
    pt = Math3D.rotate(pt, 0, -pose[4]);
    return pt;
  }
  
  // this function applies a reverse pose to transform a direction
  static applyPoseToDir(dir, pose) {
    dir = Math3D.rotate(dir, 2, -pose[6]);
    dir = Math3D.rotate(dir, 1, -pose[5]);
    dir = Math3D.rotate(dir, 0, -pose[4]);
    return dir;
  }
}
