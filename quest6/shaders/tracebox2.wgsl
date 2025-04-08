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
  return vec3f(pt.x + dx, pt.y + dy, pt.z + dz);
}

fn rotate(pt: vec3f, axis: i32, angle: f32) -> vec3f {
  let c = cos(angle);
  let s = sin(angle);
  switch (axis) {
    case 0: {
      return vec3f(pt.x, pt.y * c - pt.z * s, pt.y * s + pt.z * c);
    }
    case 1: {
      return vec3f(pt.x * c + pt.z * s, pt.y, -pt.x * s + pt.z * c);
    }
    case 2: {
      return vec3f(pt.x * c - pt.y * s, pt.x * s + pt.y * c, pt.z);
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

const EPSILON: f32 = 0.00000001;

struct Camera {
  pose: Pose,
  focal: vec2f,
  res: vec2f,
}

struct Quad {
  ll: vec4f,
  lr: vec4f,
  ur: vec4f,
  ul: vec4f,
}

struct Box {
  pose: Pose,
  scale: vec4f,
  faces: array<Quad, 6>,
}

struct Scene {
  box: Box,
  spherePose: Pose,
  sphereScale: vec4f,
}

@group(0) @binding(0) var<uniform> cameraPose: Camera;
@group(0) @binding(1) var<uniform> scene: Scene;
@group(0) @binding(2) var outTexture: texture_storage_2d<rgba8unorm, write>;

fn quadRayHitCheck(s: vec3f, d: vec3f, q: Quad, currentT: f32) -> vec2f {
  var nt = -1.0;
  if (abs(q.ll.z - q.ur.z) <= EPSILON) {
    let t = (q.ll.z - s.z) / d.z;
    if (t > 0.0) {
      let hitPt = s + t * d;
      if (q.ll.x < hitPt.x && hitPt.x < q.ur.x && q.ll.y < hitPt.y && hitPt.y < q.ur.y) {
        nt = t;
      }
    }
  } else if (abs(q.ll.y - q.ur.y) <= EPSILON) {
    let t = (q.ll.y - s.y) / d.y;
    if (t > 0.0) {
      let hitPt = s + t * d;
      if (q.ll.x < hitPt.x && hitPt.x < q.ur.x && q.ll.z < hitPt.z && hitPt.z < q.ur.z) {
        nt = t;
      }
    }
  } else if (abs(q.ll.x - q.ur.x) <= EPSILON) {
    let t = (q.ll.x - s.x) / d.x;
    if (t > 0.0) {
      let hitPt = s + t * d;
      if (q.ll.y < hitPt.y && hitPt.y < q.ur.y && q.ll.z < hitPt.z && hitPt.z < q.ur.z) {
        nt = t;
      }
    }
  }
  if (nt < 0.0) {
    return vec2f(currentT, -1.0);
  } else if (currentT < 0.0) {
    return vec2f(nt, 1.0);
  } else {
    if (nt < currentT) {
      return vec2f(nt, 1.0);
    } else {
      return vec2f(currentT, -1.0);
    }
  }
}

fn rayBoxIntersection(startPt: vec3f, dir: vec3f) -> vec2f {
  var t = -1.0;
  var idx = -1.0;
  for (var i = 0; i < 6; i++) {
    let info = quadRayHitCheck(startPt, dir, scene.box.faces[i], t);
    if (info.y > 0.0) {
      t = info.x;
      idx = f32(i);
    }
  }
  return vec2f(t, idx);
}

fn raySphereIntersection(startPt: vec3f, dir: vec3f, radius: f32) -> f32 {
  let A = dot(dir, dir);
  let B = 2.0 * dot(startPt, dir);
  let C = dot(startPt, startPt) - radius * radius;
  let discriminant = B * B - 4.0 * A * C;
  if (discriminant < 0.0) {
    return -1.0;
  }
  let sqrtD = sqrt(discriminant);
  let t1 = (-B - sqrtD) / (2.0 * A);
  let t2 = (-B + sqrtD) / (2.0 * A);
  var tHit = -1.0;
  if (t1 > 0.0 && t2 > 0.0) {
    tHit = min(t1, t2);
  } else if (t1 > 0.0) {
    tHit = t1;
  } else if (t2 > 0.0) {
    tHit = t2;
  }
  return tHit;
}

fn transformRayForBox(s: vec3f, d: vec3f) -> array<vec3f,2> {
  let sCam = applyPoseToPoint(s, cameraPose.pose);
  let dCam = applyPoseToDir(d, cameraPose.pose);
  let sLocal = applyReversePoseToPoint(sCam, scene.box.pose);
  let dLocal = applyReversePoseToDir(dCam, scene.box.pose);
  return array<vec3f,2>(sLocal, dLocal);
}

fn transformRayForSphere(s: vec3f, d: vec3f) -> array<vec3f,2> {
  let sCam = applyPoseToPoint(s, cameraPose.pose);
  let dCam = applyPoseToDir(d, cameraPose.pose);
  let sLocal = applyReversePoseToPoint(sCam, scene.spherePose);
  let dLocal = applyReversePoseToDir(dCam, scene.spherePose);
  return array<vec3f,2>(sLocal, dLocal);
}

fn assignColor(uv: vec2i, t: f32, faceIndex: i32) {
  var c: vec4f;
  if (t > 0.0) {
    if (faceIndex >= 0 && faceIndex < 6) {
      var baseC: vec4f;
      switch(faceIndex) {
        case 0: { baseC = vec4f(232./255.,119./255.,34./255.,1.); break; }
        case 1: { baseC = vec4f(255./255.,163./255.,0./255.,1.); break; }
        case 2: { baseC = vec4f(0./255.,130./255.,186./255.,1.); break; }
        case 3: { baseC = vec4f(89./255.,203./255.,232./255.,1.); break; }
        case 4: { baseC = vec4f(217./255.,217./255.,214./255.,1.); break; }
        case 5: { baseC = vec4f(167./255.,168./255.,170./255.,1.); break; }
        default: { baseC = vec4f(0.,0.,0.,1.); }
      }
      let factor = clamp(t / 3.0, 0.0, 1.0);
      let depthColor = mix(vec3f(1.0,0.0,0.0), vec3f(0.0,0.0,1.0), factor);
      let finalRGB = mix(baseC.xyz, depthColor, 0.6);
      c = vec4f(finalRGB,1.0);
    } else {
      let factor = clamp(t / 3.0, 0.0, 1.0);
      let depthColor = mix(vec3f(1.0,0.0,0.0), vec3f(0.0,0.0,1.0), factor);
      let finalRGB = mix(vec3f(1.0,0.0,1.0), depthColor, 0.6);
      c = vec4f(finalRGB,1.0);
    }
  } else {
    c = vec4f(0.0,0.0,0.0,1.0);
  }
  textureStore(outTexture, uv, c);
}

@compute
@workgroup_size(16,16)
fn computeOrthogonalMain(@builtin(global_invocation_id) gid: vec3u) {
  let uv = vec2i(gid.xy);
  let texDim = vec2i(textureDimensions(outTexture));
  if (uv.x < texDim.x && uv.y < texDim.y) {
    let psize = vec2f(2.,2.) / cameraPose.res;
    let startPt = vec3f(
      (f32(uv.x)+0.5)*psize.x-1.,
      (f32(uv.y)+0.5)*psize.y-1.,
      0.
    );
    let dir = vec3f(0.,0.,1.);
    let rayBox = transformRayForBox(startPt, dir);
    let boxHit = rayBoxIntersection(rayBox[0], rayBox[1]);
    let raySphere = transformRayForSphere(startPt, dir);
    let sT = raySphereIntersection(raySphere[0], raySphere[1], scene.sphereScale.x);
    var finalT = -1.0;
    var idx = -1.0;
    if (boxHit.x>0.0 && (sT<0.0 || boxHit.x<sT)) {
      finalT = boxHit.x;
      idx = boxHit.y;
    }
    if (sT>0.0 && (boxHit.x<0.0 || sT<boxHit.x)) {
      finalT = sT;
      idx = 6.0;
    }
    assignColor(uv, finalT, i32(idx));
  }
}

@compute
@workgroup_size(16,16)
fn computeProjectiveMain(@builtin(global_invocation_id) gid: vec3u) {
  let uv = vec2i(gid.xy);
  let texDim = vec2i(textureDimensions(outTexture));
  if (uv.x < texDim.x && uv.y < texDim.y) {
    let xNdc = (f32(uv.x)+0.5)/cameraPose.res.x*2.-1.;
    let yNdc = (f32(uv.y)+0.5)/cameraPose.res.y*2.-1.;
    let px = xNdc/cameraPose.focal.x;
    let py = yNdc/cameraPose.focal.y;
    let startPt = vec3f(0.,0.,0.);
    let dir = normalize(vec3f(px,py,1.));
    let rayBox = transformRayForBox(startPt, dir);
    let boxHit = rayBoxIntersection(rayBox[0], rayBox[1]);
    let raySphere = transformRayForSphere(startPt, dir);
    let sT = raySphereIntersection(raySphere[0], raySphere[1], scene.sphereScale.x);
    var finalT = -1.0;
    var idx = -1.0;
    if (boxHit.x>0.0 && (sT<0.0 || boxHit.x<sT)) {
      finalT = boxHit.x;
      idx = boxHit.y;
    }
    if (sT>0.0 && (boxHit.x<0.0 || sT<boxHit.x)) {
      finalT = sT;
      idx = 6.0;
    }
    assignColor(uv, finalT, i32(idx));
  }
}
