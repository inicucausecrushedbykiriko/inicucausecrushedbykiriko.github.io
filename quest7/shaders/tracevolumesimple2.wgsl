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

// struct to store the volume info
struct VolInfo {
  dims: vec4f, // volume dimension
  sizes: vec4f, // voxel sizes
}

// define a constant
const EPSILON : f32 = 0.00000001;

// struct to store camera
struct Camera {
  pose: Pose,
  focal: vec2f,
  res: vec2f,
}

// binding the camera pose
@group(0) @binding(0) var<uniform> cameraPose: Camera ;
// binding the volume info
@group(0) @binding(1) var<uniform> volInfo: VolInfo;
// binding the volume data
@group(0) @binding(2) var<storage> volData: array<f32>;
// binding the output texture to store the ray tracing results
@group(0) @binding(3) var outTexture: texture_storage_2d<rgba8unorm, write>;

// a function to transform the direction to the model coordiantes
fn transformDir(d: vec3f) -> vec3f {
  // transform the direction using the camera pose
  var out = applyPoseToDir(d, cameraPose.pose);
  return out;
}

// a function to transform the start pt to the model coordiantes
fn transformPt(pt: vec3f) -> vec3f {
  // transform the point using the camera pose
  var out = applyPoseToPoint(pt, cameraPose.pose);
  return out;
}

// a function to asign the pixel color
fn assignColor(uv: vec2i) {
  var color: vec4f;
  color = vec4f(0.f/255, 56.f/255, 101.f/255, 1.); // Bucknell Blue
  textureStore(outTexture, uv, color);  
}

// a helper function to keep track of the two ray-volume hit values
fn compareVolumeHitValues(curValue: vec2f, t: f32) -> vec2f {
  var result = curValue;
  if (curValue.x < 0) { // no hit value yet
    result.x = t; // update the closest
  }
  else {
    if (t < curValue.x) { // if find a closer hit value
      result.y = curValue.x; // update the second closest
      result.x = t;          // update the closest
    }
    else {
      if (curValue.y < 0) { // no second hit value yet
        result.y = t;
      }
      else if (t < curValue.y) { // if find a second closer
        result.y = t;
      }
    }
  }
  return result;
}

// a helper function to compute the ray-volume hit values
fn getVolumeHitValues(checkval: f32, halfsize: vec2f, pval: f32, dval: f32, p: vec2f, d: vec2f, curT: vec2f) -> vec2f {
  var cur = curT;
  if (abs(dval) > EPSILON) {
    let t = (checkval - pval) / dval; // compute the current hit point to the check value
    if (t > 0) {
      let hPt = p + t * d;
      if (-halfsize.x < hPt.x && hPt.x < halfsize.x && -halfsize.y < hPt.y && hPt.y < halfsize.y) {
        cur = compareVolumeHitValues(cur, t);
      }
    }
  }
  return cur;
}

// a function to compute the start and end t values of the ray hitting the volume
fn rayVolumeIntersection(p: vec3f, d: vec3f) -> vec2f {
  var hitValues = vec2f(-1, -1);
  let halfsize = volInfo.dims * volInfo.sizes * 0.5 / max(max(volInfo.dims.x, volInfo.dims.y), volInfo.dims.z); // 1mm
  //let halfsize = vec3f(0.5, 0.5, 0.5) * volInfo.sizes.xyz;
  // hitPt = p + t * d => t = (hitPt - p) / d
  hitValues = getVolumeHitValues(halfsize.z, halfsize.xy, p.z, d.z, p.xy, d.xy, hitValues); // z = halfsize.z
  hitValues = getVolumeHitValues(-halfsize.z, halfsize.xy, p.z, d.z, p.xy, d.xy, hitValues); // z = -halfsize.z
  hitValues = getVolumeHitValues(-halfsize.x, halfsize.yz, p.x, d.x, p.yz, d.yz, hitValues); // x = -halfsize.x
  hitValues = getVolumeHitValues(halfsize.x, halfsize.yz, p.x, d.x, p.yz, d.yz, hitValues); // x = halfsize.x
  hitValues = getVolumeHitValues(halfsize.y, halfsize.xz, p.y, d.y, p.xz, d.xz, hitValues); // y = halfsize.y
  hitValues = getVolumeHitValues(-halfsize.y, halfsize.xz, p.y, d.y, p.xz, d.xz, hitValues); // y = -halfsize.y
  return hitValues;
}

// a helper function to get the next hit value
fn getNextHitValue(startT: f32, curT: f32, checkval: f32, minCorner: vec2f, maxCorner: vec2f, pval: f32, dval: f32, p: vec2f, d: vec2f) -> f32 {
  var cur = curT;
  if (abs(dval) > EPSILON) {
    let t = (checkval - pval) / dval; // compute the current hit point to the check value
    let hPt = p + t * d;
    if (minCorner.x < hPt.x && hPt.x < maxCorner.x && minCorner.y < hPt.y && hPt.y < maxCorner.y) {
      if (t > startT && cur < t) {
        cur = t;
      }
    }
  }
  return cur;
}

// a function to trace the volume - volume rendering
fn traceScene(uv: vec2i, p: vec3f, d: vec3f) {
  // find the start and end point
  var hits = rayVolumeIntersection(p, d);
  var color = vec4f(0.f/255, 0.f/255, 0.f/255, 1.); 
  // if there is only one hit point, we trace from the camera center
  if (hits.y < 0 && hits.x > 0) {
    hits.y = hits.x;
    hits.x = 0;
  }
  // assign colors
  if (hits.x >= 0) { 
    let diff = hits.y - hits.x;
    color = vec4f(diff, 1 - diff, 0, 1.);
  }
  else {
    color = vec4f(0.f/255, 56.f/255, 101.f/255, 1.); // Bucknell Blue
  }
  textureStore(outTexture, uv, color);  
}

@compute
@workgroup_size(16, 16)
fn computeOrthogonalMain(@builtin(global_invocation_id) global_id: vec3u) {
  // get the pixel coordiantes
  let uv = vec2i(global_id.xy);
  let texDim = vec2i(textureDimensions(outTexture));
  if (uv.x < texDim.x && uv.y < texDim.y) {
    // compute the pixel size
    let psize = vec2f(2, 2) / cameraPose.res.xy;
    // orthogonal camera ray sent from each pixel center at z = 0
    var spt = vec3f((f32(uv.x) + 0.5) * psize.x - 1, (f32(uv.y) + 0.5) * psize.y - 1, 0);
    var rdir = vec3f(0, 0, 1);
    // apply transformation
    spt = transformPt(spt);
    rdir = transformDir(rdir);
    // trace scene
    traceScene(uv, spt, rdir);
  }
}

@compute
@workgroup_size(16, 16)
fn computeProjectiveMain(@builtin(global_invocation_id) global_id: vec3u) {
  // TODO: copy your code of quest 6 here
  // This should be very similar to the orthogonal one above
  
}
