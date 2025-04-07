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
struct CameraPose {
  pose : array<vec4<f32>, 4>,
  focal : vec2<f32>,
  res : vec2<f32>,
};

struct BoxData {
  pose : array<vec4<f32>, 2>,
  scales : vec4<f32>,
  front : array<vec4<f32>, 4>,
  back : array<vec4<f32>, 4>,
  left : array<vec4<f32>, 4>,
  right : array<vec4<f32>, 4>,
  top : array<vec4<f32>, 4>,
  down : array<vec4<f32>, 4>,
};

@group(0) @binding(0) var<uniform> cameraPose : CameraPose;
@group(0) @binding(1) var<uniform> boxData : BoxData;
@group(0) @binding(2) var outTexture : texture_storage_2d<rgba8unorm, write>;

fn rotateX(p: vec3<f32>, a: f32) -> vec3<f32> {
  let c = cos(a);
  let s = sin(a);
  return vec3<f32>(p.x, p.y * c - p.z * s, p.y * s + p.z * c);
}
fn rotateY(p: vec3<f32>, a: f32) -> vec3<f32> {
  let c = cos(a);
  let s = sin(a);
  return vec3<f32>(p.x * c + p.z * s, p.y, -p.x * s + p.z * c);
}
fn rotateZ(p: vec3<f32>, a: f32) -> vec3<f32> {
  let c = cos(a);
  let s = sin(a);
  return vec3<f32>(p.x * c - p.y * s, p.x * s + p.y * c, p.z);
}

// Inverse transform functions for the camera pose
fn inverseCameraPoseToPoint(pt: vec3<f32>) -> vec3<f32> {
  let tx = cameraPose.pose[0].x;
  let ty = cameraPose.pose[0].y;
  let tz = cameraPose.pose[0].z;
  let rx = cameraPose.pose[1].x;
  let ry = cameraPose.pose[1].y;
  let rz = cameraPose.pose[1].z;
  var p = pt - vec3<f32>(tx, ty, tz);
  p = rotateZ(p, -rz);
  p = rotateY(p, -ry);
  p = rotateX(p, -rx);
  return p;
}
fn inverseCameraPoseToDir(dir: vec3<f32>) -> vec3<f32> {
  let rx = cameraPose.pose[1].x;
  let ry = cameraPose.pose[1].y;
  let rz = cameraPose.pose[1].z;
  var d = dir;
  d = rotateZ(d, -rz);
  d = rotateY(d, -ry);
  d = rotateX(d, -rx);
  return d;
}

// Inverse transform functions for the box (object) pose
fn inverseBoxPoseToPoint(pt: vec3<f32>) -> vec3<f32> {
  let tx = boxData.pose[0].x;
  let ty = boxData.pose[0].y;
  let tz = boxData.pose[0].z;
  let rx = boxData.pose[1].x;
  let ry = boxData.pose[1].y;
  let rz = boxData.pose[1].z;
  var p = pt - vec3<f32>(tx, ty, tz);
  p = rotateZ(p, -rz);
  p = rotateY(p, -ry);
  p = rotateX(p, -rx);
  return p;
}
fn inverseBoxPoseToDir(dir: vec3<f32>) -> vec3<f32> {
  let rx = boxData.pose[1].x;
  let ry = boxData.pose[1].y;
  let rz = boxData.pose[1].z;
  var d = dir;
  d = rotateZ(d, -rz);
  d = rotateY(d, -ry);
  d = rotateX(d, -rx);
  return d;
}

fn intersectBox(ro: vec3<f32>, rd: vec3<f32>) -> vec2<f32> {
  var tMin = 1e9;
  var chosenFace = 0;
  let faces = array<array<vec4<f32>, 4>, 6>(
    array<vec4<f32>, 4>(boxData.front[0], boxData.front[1], boxData.front[2], boxData.front[3]),
    array<vec4<f32>, 4>(boxData.back[0], boxData.back[1], boxData.back[2], boxData.back[3]),
    array<vec4<f32>, 4>(boxData.left[0], boxData.left[1], boxData.left[2], boxData.left[3]),
    array<vec4<f32>, 4>(boxData.right[0], boxData.right[1], boxData.right[2], boxData.right[3]),
    array<vec4<f32>, 4>(boxData.top[0], boxData.top[1], boxData.top[2], boxData.top[3]),
    array<vec4<f32>, 4>(boxData.down[0], boxData.down[1], boxData.down[2], boxData.down[3])
  );
  for(var i: i32 = 0; i < 6; i = i + 1) {
    let r = quadRayHitCheck(faces[i][0], faces[i][1], faces[i][2], faces[i][3], ro, rd);
    if(r.x > 0.0 && r.x < tMin) {
      tMin = r.x;
      chosenFace = i + 1;
    }
  }
  return vec2<f32>(tMin, f32(chosenFace));
}

fn quadRayHitCheck(q0: vec4<f32>, q1: vec4<f32>, q2: vec4<f32>, q3: vec4<f32>, ro: vec3<f32>, rd: vec3<f32>) -> vec2<f32> {
  let p0 = q0.xyz;
  let p1 = q1.xyz;
  let p2 = q2.xyz;
  let p3 = q3.xyz;
  let n = normalize(cross(p1 - p0, p2 - p0));
  let denom = dot(n, rd);
  if (abs(denom) < 1e-6) { return vec2<f32>(-1.0, 0.0); }
  let t = dot(n, p0 - ro) / denom;
  if (t < 0.0) { return vec2<f32>(-1.0, 0.0); }
  let hitPos = ro + rd * t;
  let triA = length(cross(p1 - p0, p2 - p0)) + length(cross(p2 - p0, p3 - p0));
  let area1 = length(cross(p1 - hitPos, p0 - hitPos)) +
              length(cross(p2 - hitPos, p1 - hitPos)) +
              length(cross(p3 - hitPos, p2 - hitPos)) +
              length(cross(p0 - hitPos, p3 - hitPos));
  if (area1 > triA + 1e-3) { return vec2<f32>(-1.0, 0.0); }
  return vec2<f32>(t, 0.0);
}

fn assignColor(px: vec2<u32>, t: f32, faceId: i32) {
  var col = vec4<f32>(0.0, 0.0, 0.0, 1.0);
  if(faceId == 1){ col = vec4<f32>(1.0, 0.0, 0.0, 1.0); }
  else if(faceId == 2){ col = vec4<f32>(0.0, 1.0, 0.0, 1.0); }
  else if(faceId == 3){ col = vec4<f32>(0.0, 0.0, 1.0, 1.0); }
  else if(faceId == 4){ col = vec4<f32>(1.0, 1.0, 0.0, 1.0); }
  else if(faceId == 5){ col = vec4<f32>(1.0, 0.0, 1.0, 1.0); }
  else if(faceId == 6){ col = vec4<f32>(0.0, 1.0, 1.0, 1.0); }
  textureStore(outTexture, px, col);
}

@compute @workgroup_size(16, 16)
fn computeOrthogonalMain(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dim = textureDimensions(outTexture);
  if(gid.x >= dim.x || gid.y >= dim.y){ return; }
  let uv = vec2<f32>(gid.xy);
  let sz = cameraPose.res;
  let pxSize = 2.0 / sz;
  let x = (uv.x + 0.5) * pxSize.x - 1.0;
  let y = (uv.y + 0.5) * pxSize.y - 1.0;
  // Generate ray in camera space (orthogonal)
  var ro = vec3<f32>(x, y, 0.0);
  var rd = vec3<f32>(0.0, 0.0, 1.0);
  // Transform ray from camera space to world space
  ro = inverseCameraPoseToPoint(ro);
  rd = normalize(inverseCameraPoseToDir(rd));
  // Then transform from world space into object (box) space
  ro = inverseBoxPoseToPoint(ro);
  rd = normalize(inverseBoxPoseToDir(rd));
  let r = intersectBox(ro, rd);
  assignColor(vec2<u32>(gid.xy), r.x, i32(r.y));
}

@compute @workgroup_size(16, 16)
fn computeProjectiveMain(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dim = textureDimensions(outTexture);
  if(gid.x >= dim.x || gid.y >= dim.y){ return; }
  let uv = vec2<f32>(gid.xy);
  let sz = cameraPose.res;
  let px = (uv.x + 0.5) / sz.x * 2.0 - 1.0;
  let py = (uv.y + 0.5) / sz.y * 2.0 - 1.0;
  let fx = px / cameraPose.focal.x;
  let fy = py / cameraPose.focal.y;
  // Generate ray in camera space (projective)
  var ro = vec3<f32>(0.0, 0.0, 0.0);
  var rd = normalize(vec3<f32>(fx, fy, 1.0));
  // Transform ray from camera space to world space
  ro = inverseCameraPoseToPoint(ro);
  rd = normalize(inverseCameraPoseToDir(rd));
  // Then transform from world space into object (box) space
  ro = inverseBoxPoseToPoint(ro);
  rd = normalize(inverseBoxPoseToDir(rd));
  let r = intersectBox(ro, rd);
  assignColor(vec2<u32>(gid.xy), r.x, i32(r.y));
}
