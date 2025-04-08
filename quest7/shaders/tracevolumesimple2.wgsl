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

struct Pose {
  pos: vec4f,
  angles: vec4f,
}
fn translate(pt: vec3f, dx: f32, dy: f32, dz: f32) -> vec3f {
  return vec3f(pt[0] + dx, pt[1] + dy, pt[2] + dz);
}
fn rotate(pt: vec3f, axis: i32, angle: f32) -> vec3f {
  let c = cos(angle);
  let s = sin(angle);
  switch (axis) {
    case 0: {
      return vec3f(pt[0], pt[1] * c - pt[2] * s, pt[1] * s + pt[2] * c);
    }
    case 1: {
      return vec3f(pt[0] * c + pt[2] * s, pt[1], -pt[0] * s + pt[2] * c);
    }
    case 2: {
      return vec3f(pt[0] * c - pt[1] * s, pt[0] * s + pt[1] * c, pt[2]);
    }
    default: {
      return pt;
    }
  }
}
fn applyPoseToPoint(pt: vec3f, pose: Pose) -> vec3f {
  var out = rotate(pt, 0, pose.angles.x);
  out = rotate(out, 1, pose.angles.y);
  out = rotate(out, 2, pose.angles.z);
  out = translate(out, pose.pos.x, pose.pos.y, pose.pos.z);
  return out;
}
fn applyPoseToDir(dir: vec3f, pose: Pose) -> vec3f {
  var out = rotate(dir, 0, pose.angles.x);
  out = rotate(out, 1, pose.angles.y);
  out = rotate(out, 2, pose.angles.z);
  return out;
}
fn applyReversePoseToPoint(pt: vec3f, pose: Pose) -> vec3f {
  var out = translate(pt, -pose.pos.x, -pose.pos.y, -pose.pos.z);
  out = rotate(out, 2, -pose.angles.z);
  out = rotate(out, 1, -pose.angles.y);
  out = rotate(out, 0, -pose.angles.x);
  return out;
}
fn applyReversePoseToDir(dir: vec3f, pose: Pose) -> vec3f {
  var out = rotate(dir, 2, -pose.angles.z);
  out = rotate(out, 1, -pose.angles.y);
  out = rotate(out, 0, -pose.angles.x);
  return out;
}
struct VolInfo {
  dims: vec4f,
  sizes: vec4f,
}
const EPSILON : f32 = 0.00000001;
struct Camera {
  pose: Pose,
  focal: vec2f,
  res: vec2f,
}
@group(0) @binding(0) var<uniform> cameraPose: Camera;
@group(0) @binding(1) var<uniform> volInfo: VolInfo;
@group(0) @binding(2) var<storage> volData: array<f32>;
@group(0) @binding(3) var outTexture: texture_storage_2d<rgba8unorm, write>;
fn transformDir(d: vec3f) -> vec3f {
  var out = applyPoseToDir(d, cameraPose.pose);
  return out;
}
fn transformPt(pt: vec3f) -> vec3f {
  var out = applyPoseToPoint(pt, cameraPose.pose);
  return out;
}
fn assignColor(uv: vec2i) {
  var color: vec4f;
  color = vec4f(0, 56.0/255.0, 101.0/255.0, 1.0);
  textureStore(outTexture, uv, color);
}
fn compareVolumeHitValues(curValue: vec2f, t: f32) -> vec2f {
  var result = curValue;
  if (curValue.x < 0) {
    result.x = t;
  } else {
    if (t < curValue.x) {
      result.y = curValue.x;
      result.x = t;
    } else {
      if (curValue.y < 0) {
        result.y = t;
      } else if (t < curValue.y) {
        result.y = t;
      }
    }
  }
  return result;
}
fn getVolumeHitValues(checkval: f32, halfsize: vec2f, pval: f32, dval: f32, p: vec2f, d: vec2f, curT: vec2f) -> vec2f {
  var cur = curT;
  if (abs(dval) > EPSILON) {
    let t = (checkval - pval) / dval;
    if (t > 0) {
      let hPt = p + t * d;
      if (-halfsize.x < hPt.x && hPt.x < halfsize.x && -halfsize.y < hPt.y && hPt.y < halfsize.y) {
        cur = compareVolumeHitValues(cur, t);
      }
    }
  }
  return cur;
}
fn rayVolumeIntersection(p: vec3f, d: vec3f) -> vec2f {
  var hitValues = vec2f(-1, -1);
  let halfsize = volInfo.dims * volInfo.sizes * 0.5 / max(max(volInfo.dims.x, volInfo.dims.y), volInfo.dims.z);
  hitValues = getVolumeHitValues(halfsize.z, halfsize.xy, p.z, d.z, p.xy, d.xy, hitValues);
  hitValues = getVolumeHitValues(-halfsize.z, halfsize.xy, p.z, d.z, p.xy, d.xy, hitValues);
  hitValues = getVolumeHitValues(-halfsize.x, halfsize.yz, p.x, d.x, p.yz, d.yz, hitValues);
  hitValues = getVolumeHitValues(halfsize.x, halfsize.yz, p.x, d.x, p.yz, d.yz, hitValues);
  hitValues = getVolumeHitValues(halfsize.y, halfsize.xz, p.y, d.y, p.xz, d.xz, hitValues);
  hitValues = getVolumeHitValues(-halfsize.y, halfsize.xz, p.y, d.y, p.xz, d.xz, hitValues);
  return hitValues;
}
fn getNextHitValue(startT: f32, curT: f32, checkval: f32, minCorner: vec2f, maxCorner: vec2f, pval: f32, dval: f32, p: vec2f, d: vec2f) -> f32 {
  var cur = curT;
  if (abs(dval) > EPSILON) {
    let t = (checkval - pval) / dval;
    let hPt = p + t * d;
    if (minCorner.x < hPt.x && hPt.x < maxCorner.x && minCorner.y < hPt.y && hPt.y < maxCorner.y) {
      if (t > startT && cur < t) {
        cur = t;
      }
    }
  }
  return cur;
}
fn traceScene(uv: vec2i, p: vec3f, d: vec3f) {
  var hits = rayVolumeIntersection(p, d);
  var color = vec4f(0, 0, 0, 1);
  if (hits.y < 0 && hits.x > 0) {
    hits.y = hits.x;
    hits.x = 0;
  }
  if (hits.x >= 0) {
    let diff = hits.y - hits.x;
    color = vec4f(diff, 1.0 - diff, 0.0, 1.0);
  } else {
    color = vec4f(0, 56.0/255.0, 101.0/255.0, 1);
  }
  textureStore(outTexture, uv, color);
}
@compute
@workgroup_size(16, 16)
fn computeOrthogonalMain(@builtin(global_invocation_id) global_id: vec3u) {
  let uv = vec2i(global_id.xy);
  let texDim = vec2i(textureDimensions(outTexture));
  if (uv.x < texDim.x && uv.y < texDim.y) {
    let psize = vec2f(2, 2) / cameraPose.res.xy;
    var spt = vec3f((f32(uv.x) + 0.5) * psize.x - 1, (f32(uv.y) + 0.5) * psize.y - 1, 0);
    var rdir = vec3f(0, 0, 1);
    spt = transformPt(spt);
    rdir = transformDir(rdir);
    traceScene(uv, spt, rdir);
  }
}
@compute
@workgroup_size(16, 16)
fn computeProjectiveMain(@builtin(global_invocation_id) global_id: vec3u) {
  let uv = vec2i(global_id.xy);
  let texDim = vec2i(textureDimensions(outTexture));
  if (uv.x < texDim.x && uv.y < texDim.y) {
    let nx = (f32(uv.x) + 0.5) / cameraPose.res.x * 2.0 - 1.0;
    let ny = (f32(uv.y) + 0.5) / cameraPose.res.y * 2.0 - 1.0;
    var eyePos = vec3f(0.0, 0.0, 0.0);
    var dir = vec3f(nx * cameraPose.focal.x, ny * cameraPose.focal.y, -1.0);
    eyePos = transformPt(eyePos);
    dir = transformDir(dir);
    dir = normalize(dir);
    traceScene(uv, eyePos, dir);
  }
}
