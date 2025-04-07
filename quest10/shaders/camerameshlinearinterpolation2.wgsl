/* 
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

// struct to store a 3D Math pose
struct Pose {
  pos: vec4f,
  angles: vec4f,
}

// this function translates a 3d point by (dx, dy, dz)
fn translate(pt: vec3f, dx: f32, dy: f32, dz: f32) -> vec3f {
  return vec3f(pt[0] + dx, pt[1] + dy, pt[2] + dz);
}

// this function rotates a 3d point along the x/y/z-axis for angle
// axis is either 0, 1, or 2 for x-axis, y-axis, or z-axis
// angle is in rad
fn rotate(pt: vec3f, axis: i32, angle: f32) -> vec3f {
  let c = cos(angle);
  let s = sin(angle);
  switch (axis) {
    case 0: { // x-axis
      // y'=ycosθ−zsinθ, z'=ysinθ+zcosθ
      return vec3f(pt[0], pt[1] * c - pt[2] * s, pt[1] * s + pt[2] * c);
    }
    case 1: {// y-axis
      // x'=xcosθ+zsinθ, z'=−xsinθ+zcosθ
      return vec3f(pt[0] * c + pt[2] * s, pt[1], -pt[0] * s + pt[2] * c);
    }
    case 2: {// z-axis
      // x'=xcosθ−ysinθ, y'=xsinθ+ycosθ
      return vec3f(pt[0] * c - pt[1] * s, pt[0] * s + pt[1] * c, pt[2]);
    }
    default: {
      return pt;
    }
  }
}

// this function applies a pose to transform a point
fn applyPoseToPoint(pt: vec3f, pose: Pose) -> vec3f {
  var out = rotate(pt, 0, pose.angles.x);
  out = rotate(out, 1, pose.angles.y);
  out = rotate(out, 2, pose.angles.z);
  out = translate(out, pose.pos.x, pose.pos.y, pose.pos.z);
  return out;
}

// this function applies a pose to transform a direction
fn applyPoseToDir(dir: vec3f, pose: Pose) -> vec3f {
  var out = rotate(dir, 0, pose.angles.x);
  out = rotate(out, 1, pose.angles.y);
  out = rotate(out, 2, pose.angles.z);
  return out;
}

// this function applies a reverse pose to transform a point
fn applyReversePoseToPoint(pt: vec3f, pose: Pose) -> vec3f {
  var out = translate(pt, -pose.pos.x, -pose.pos.y, -pose.pos.z);
  out = rotate(out, 2, -pose.angles.z);
  out = rotate(out, 1, -pose.angles.y);
  out = rotate(out, 0, -pose.angles.x);
  return out;
}

// this function applies a reverse pose to transform a direction
fn applyReversePoseToDir(dir: vec3f, pose: Pose) -> vec3f {
  var out = rotate(dir, 2, -pose.angles.z);
  out = rotate(out, 1, -pose.angles.y);
  out = rotate(out, 0, -pose.angles.x);
  return out;
}

// define a constant
const EPSILON : f32 = 0.00000001;

// struct to store camera
struct Camera {
  pose: Pose,
  focal: vec2f,
  res: vec2f,
  t: f32,
  dummy: f32
}

// binding the camera pose
@group(0) @binding(0) var<uniform> cameraPose: Camera;

struct VertexOut {
  @builtin(position) pos: vec4f,
  @location(0) normal: vec3f,
}

@vertex // this compute the scene coordiante of each input vertex
fn vertexMain(@location(0) srcpos: vec3f, @location(1) srcnormal: vec3f, @location(2) tgtpos: vec3f, @location(3) tgtnormal: vec3f) -> VertexOut {
  // interpolate the vertices
  var interpolatePt = srcpos * (1 - cameraPose.t) + tgtpos * (cameraPose.t);
  // transform and project 
  var transformedPt = applyReversePoseToPoint(interpolatePt, cameraPose.pose);
  var projectedPt = vec2f(transformedPt.x/transformedPt.z, transformedPt.y/transformedPt.z) * cameraPose.focal;
  // compute Proper Depth for WebGPU Clip Space
  var near = 0.1;  // Adjust as needed
  var far = 100.0; // Adjust as needed
  // Map depth to WebGPU NDC range [0, 1] for depth testing
  var depth = (transformedPt.z - near) / (far - near); // Normalize Z depth
  var clipDepth = depth; // WebGPU expects depth in range [0, 1]
  // Fill in the output
  var out: VertexOut;
  out.pos = vec4f(projectedPt, clipDepth, 1);
  // interpolate the normal
  out.normal = srcnormal * (1 - cameraPose.t) + tgtnormal * (cameraPose.t);
  return out;
}

@fragment // this compute the color of each pixel
fn fragmentMain(@location(0) normal: vec3f) -> @location(0) vec4f {
  // TODO: Modify the fragment shader to implement a shader model to color the mesh using the normal
  
  return vec4f((normal + 1) * 0.5, 1); // simple normal color
}
