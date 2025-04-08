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
    case 0: { return vec3f(pt.x, pt.y * c - pt.z * s, pt.y * s + pt.z * c); }
    case 1: { return vec3f(pt.x * c + pt.z * s, pt.y, -pt.x * s + pt.z * c); }
    case 2: { return vec3f(pt.x * c - pt.y * s, pt.x * s + pt.y * c, pt.z); }
    default: { return pt; }
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
  cylinderPose: Pose,
  cylinderScale: vec4f,
  conePose: Pose,
  coneScale: vec4f,
}

@group(0) @binding(0) var<uniform> cameraPose: Camera;
@group(0) @binding(1) var<uniform> scene: Scene;
@group(0) @binding(2) var outTexture: texture_storage_2d<rgba8unorm, write>;

fn quadRayHitCheck(s: vec3f, d: vec3f, q: Quad, currentT: f32) -> vec2f {
  var nt = -1.0;
  if (abs(q.ll.z - q.ur.z) <= EPSILON) {
    let t = (q.ll.z - s.z) / d.z;
    if (t > 0.0) {
      let hp = s + t * d;
      if (q.ll.x < hp.x && hp.x < q.ur.x && q.ll.y < hp.y && hp.y < q.ur.y) {
        nt = t;
      }
    }
  } else if (abs(q.ll.y - q.ur.y) <= EPSILON) {
    let t = (q.ll.y - s.y) / d.y;
    if (t > 0.0) {
      let hp = s + t * d;
      if (q.ll.x < hp.x && hp.x < q.ur.x && q.ll.z < hp.z && hp.z < q.ur.z) {
        nt = t;
      }
    }
  } else if (abs(q.ll.x - q.ur.x) <= EPSILON) {
    let t = (q.ll.x - s.x) / d.x;
    if (t > 0.0) {
      let hp = s + t * d;
      if (q.ll.y < hp.y && hp.y < q.ur.y && q.ll.z < hp.z && hp.z < q.ur.z) {
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

fn rayBoxIntersection(sp: vec3f, d: vec3f) -> vec2f {
  var t = -1.0;
  var idx = -1.0;
  for (var i = 0; i < 6; i++) {
    let info = quadRayHitCheck(sp, d, scene.box.faces[i], t);
    if (info.y > 0.0) {
      t = info.x;
      idx = f32(i);
    }
  }
  return vec2f(t, idx);
}

fn raySphereIntersection(sp: vec3f, d: vec3f, radius: f32) -> f32 {
  let A = dot(d, d);
  let B = 2.0 * dot(sp, d);
  let C = dot(sp, sp) - radius * radius;
  let disc = B * B - 4.0 * A * C;
  if (disc < 0.0) {
    return -1.0;
  }
  let sd = sqrt(disc);
  let t1 = (-B - sd) / (2.0 * A);
  let t2 = (-B + sd) / (2.0 * A);
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

fn rayCylinderIntersection(sp: vec3f, d: vec3f, radius: f32, halfH: f32) -> f32 {
  let A = d.x * d.x + d.z * d.z;
  if (A < EPSILON) {
    return -1.0;
  }
  let B = 2.0 * (sp.x * d.x + sp.z * d.z);
  let C = sp.x * sp.x + sp.z * sp.z - radius * radius;
  let disc = B * B - 4.0 * A * C;
  if (disc < 0.0) {
    return -1.0;
  }
  let sd = sqrt(disc);
  let t1 = (-B - sd) / (2.0 * A);
  let t2 = (-B + sd) / (2.0 * A);
  var tHit = -1.0;
  if (t1 > 0.0 && t2 > 0.0) {
    let tchk = min(t1, t2);
    let yhit = sp.y + tchk * d.y;
    if (abs(yhit) <= halfH) {
      tHit = tchk;
    } else {
      let other = max(t1, t2);
      if (other > 0.0) {
        let y2 = sp.y + other * d.y;
        if (abs(y2) <= halfH) {
          tHit = other;
        }
      }
    }
  } else if (t1 > 0.0) {
    let y1 = sp.y + t1 * d.y;
    if (abs(y1) <= halfH) {
      tHit = t1;
    }
  } else if (t2 > 0.0) {
    let y2 = sp.y + t2 * d.y;
    if (abs(y2) <= halfH) {
      tHit = t2;
    }
  }
  return tHit;
}

fn rayConeIntersection(sp: vec3f, d: vec3f, radius: f32, halfH: f32) -> vec2f {
  // For a finite cone with apex at y = +halfH and base at y = -halfH.
  // In local coordinates, the cone side satisfies: x^2 + z^2 = (slope^2)*(y - halfH)^2
  let slope = radius / (2.0 * halfH);
  let sy = sp.y - halfH;
  let dy = d.y;
  let A = d.x*d.x + d.z*d.z - slope*slope*(dy*dy);
  if (abs(A) < EPSILON) {
    return vec2f(-1.0, -1.0);
  }
  let B = 2.0*(sp.x*d.x + sp.z*d.z - slope*slope*(sy*dy));
  let C = sp.x*sp.x + sp.z*sp.z - slope*slope*(sy*sy);
  let disc = B*B - 4.0*A*C;
  var bestT = -1.0;
  var faceIdx = -1.0; // 8: cone side, 9: cone base
  if (disc >= 0.0) {
    let sd = sqrt(disc);
    let t1 = (-B - sd) / (2.0 * A);
    let t2 = (-B + sd) / (2.0 * A);
    if (t1 > 0.0 && t2 > 0.0) {
      let tside = min(t1, t2);
      let yhit = sp.y + tside * d.y;
      if (yhit >= -halfH && yhit <= halfH) {
        bestT = tside;
        faceIdx = 8;
      } else {
        // Use mutable variable for tdisc.
        var tdisc : f32 = -1.0;
        if (t1 > t2) {
          tdisc = t1;
        } else {
          tdisc = t2;
        }
        if (tdisc > 0.0) {
          let y2 = sp.y + tdisc * d.y;
          if (y2 >= -halfH && y2 <= halfH) {
            bestT = tdisc;
            faceIdx = 8;
          }
        }
      }
    } else if (t1 > 0.0) {
      let y1 = sp.y + t1 * d.y;
      if (y1 >= -halfH && y1 <= halfH) {
        bestT = t1;
        faceIdx = 8;
      }
    } else if (t2 > 0.0) {
      let y2 = sp.y + t2 * d.y;
      if (y2 >= -halfH && y2 <= halfH) {
        bestT = t2;
        faceIdx = 8;
      }
    }
  }
  var tdisc : f32 = -1.0;
  if (abs(d.y) > EPSILON) {
    let tbase = (-halfH - sp.y) / d.y;
    if (tbase > 0.0) {
      let xh = sp.x + tbase * d.x;
      let zh = sp.z + tbase * d.z;
      if (xh*xh + zh*zh <= radius*radius) {
        tdisc = tbase;
      }
    }
  }
  if (tdisc > 0.0 && (bestT < 0.0 || tdisc < bestT)) {
    bestT = tdisc;
    faceIdx = 9;
  }
  return vec2f(bestT, f32(faceIdx));
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

fn transformRayForCylinder(s: vec3f, d: vec3f) -> array<vec3f,2> {
  let sCam = applyPoseToPoint(s, cameraPose.pose);
  let dCam = applyPoseToDir(d, cameraPose.pose);
  let sLocal = applyReversePoseToPoint(sCam, scene.cylinderPose);
  let dLocal = applyReversePoseToDir(dCam, scene.cylinderPose);
  return array<vec3f,2>(sLocal, dLocal);
}

fn transformRayForCone(s: vec3f, d: vec3f) -> array<vec3f,2> {
  let sCam = applyPoseToPoint(s, cameraPose.pose);
  let dCam = applyPoseToDir(d, cameraPose.pose);
  let sLocal = applyReversePoseToPoint(sCam, scene.conePose);
  let dLocal = applyReversePoseToDir(dCam, scene.conePose);
  return array<vec3f,2>(sLocal, dLocal);
}

// assignColor: 
// box faces 0..5, sphere 6, cylinder 7, cone side 8, cone base 9.
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
      let factor = clamp(t/3.0, 0.0, 1.0);
      let depthColor = mix(vec3f(1.0,0.0,0.0), vec3f(0.0,0.0,1.0), factor);
      let finalRGB = mix(baseC.xyz, depthColor, 0.6);
      c = vec4f(finalRGB, 1.0);
    } else if (faceIndex == 6) {
      let factor = clamp(t/3.0, 0.0, 1.0);
      let depthColor = mix(vec3f(1.0,0.0,0.0), vec3f(0.0,0.0,1.0), factor);
      let finalRGB = mix(vec3f(1.0,0.0,1.0), depthColor, 0.6);
      c = vec4f(finalRGB, 1.0);
    } else if (faceIndex == 7) {
      let factor = clamp(t/3.0, 0.0, 1.0);
      let depthColor = mix(vec3f(1.0,1.0,0.0), vec3f(0.0,1.0,0.0), factor);
      let finalRGB = mix(vec3f(0.0,1.0,0.0), depthColor, 0.7);
      c = vec4f(finalRGB, 1.0);
    } else if (faceIndex == 8) {
      // cone side
      let factor = clamp(t/3.0, 0.0, 1.0);
      let depthColor = mix(vec3f(1.0,0.5,0.0), vec3f(0.0,1.0,1.0), factor);
      let finalRGB = mix(vec3f(1.0,0.5,1.0), depthColor, 0.4);
      c = vec4f(finalRGB, 1.0);
    } else if (faceIndex == 9) {
      // cone base
      let factor = clamp(t/3.0, 0.0, 1.0);
      let depthColor = mix(vec3f(1.0,0.3,0.3), vec3f(0.1,0.1,1.0), factor);
      let finalRGB = mix(vec3f(1.0,1.0,0.0), depthColor, 0.5);
      c = vec4f(finalRGB, 1.0);
    } else {
      c = vec4f(1.0,1.0,1.0,1.0);
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
    let startPt = vec3f((f32(uv.x)+0.5)*psize.x-1., (f32(uv.y)+0.5)*psize.y-1., 0.);
    let dir = vec3f(0.,0.,1.);
    let rb = transformRayForBox(startPt, dir);
    let boxHit = rayBoxIntersection(rb[0], rb[1]);
    let rs = transformRayForSphere(startPt, dir);
    let sT = raySphereIntersection(rs[0], rs[1], scene.sphereScale.x);
    let rc = transformRayForCylinder(startPt, dir);
    let cT = rayCylinderIntersection(rc[0], rc[1], scene.cylinderScale.x, scene.cylinderScale.y);
    let rcone = transformRayForCone(startPt, dir);
    let coneInfo = rayConeIntersection(rcone[0], rcone[1], scene.coneScale.x, scene.coneScale.y);
    var finalT = -1.0;
    var fIdx = -1.0;
    if (boxHit.x > 0.0 && (sT < 0.0 || boxHit.x < sT) &&
        (cT < 0.0 || boxHit.x < cT) && (coneInfo.x < 0.0 || boxHit.x < coneInfo.x)) {
      finalT = boxHit.x;
      fIdx = boxHit.y;
    }
    if (sT > 0.0 && (finalT < 0.0 || sT < finalT) &&
        (cT < 0.0 || sT < cT) && (coneInfo.x < 0.0 || sT < coneInfo.x)) {
      finalT = sT;
      fIdx = 6.0;
    }
    if (cT > 0.0 && (finalT < 0.0 || cT < finalT) &&
        (sT < 0.0 || cT < sT) && (coneInfo.x < 0.0 || cT < coneInfo.x)) {
      finalT = cT;
      fIdx = 7.0;
    }
    if (coneInfo.x > 0.0 && (finalT < 0.0 || coneInfo.x < finalT) &&
        (sT < 0.0 || coneInfo.x < sT) && (cT < 0.0 || coneInfo.x < cT)) {
      finalT = coneInfo.x;
      fIdx = coneInfo.y;
    }
    assignColor(uv, finalT, i32(fIdx));
  }
}

@compute
@workgroup_size(16,16)
fn computeProjectiveMain(@builtin(global_invocation_id) gid: vec3u) {
  let uv = vec2i(gid.xy);
  let texDim = vec2i(textureDimensions(outTexture));
  if (uv.x < texDim.x && uv.y < texDim.y) {
    let xNdc = (f32(uv.x)+0.5) / cameraPose.res.x * 2.0 - 1.0;
    let yNdc = (f32(uv.y)+0.5) / cameraPose.res.y * 2.0 - 1.0;
    let px = xNdc / cameraPose.focal.x;
    let py = yNdc / cameraPose.focal.y;
    let startPt = vec3f(0.,0.,0.);
    let dir = normalize(vec3f(px,py,1.0));
    let rb = transformRayForBox(startPt, dir);
    let boxHit = rayBoxIntersection(rb[0], rb[1]);
    let rs = transformRayForSphere(startPt, dir);
    let sT = raySphereIntersection(rs[0], rs[1], scene.sphereScale.x);
    let rc = transformRayForCylinder(startPt, dir);
    let cT = rayCylinderIntersection(rc[0], rc[1], scene.cylinderScale.x, scene.cylinderScale.y);
    let rcone = transformRayForCone(startPt, dir);
    let coneInfo = rayConeIntersection(rcone[0], rcone[1], scene.coneScale.x, scene.coneScale.y);
    var finalT = -1.0;
    var fIdx = -1.0;
    if (boxHit.x > 0.0 && (sT < 0.0 || boxHit.x < sT) &&
        (cT < 0.0 || boxHit.x < cT) && (coneInfo.x < 0.0 || boxHit.x < coneInfo.x)) {
      finalT = boxHit.x;
      fIdx = boxHit.y;
    }
    if (sT > 0.0 && (finalT < 0.0 || sT < finalT) &&
        (cT < 0.0 || sT < cT) && (coneInfo.x < 0.0 || sT < coneInfo.x)) {
      finalT = sT;
      fIdx = 6.0;
    }
    if (cT > 0.0 && (finalT < 0.0 || cT < finalT) &&
        (sT < 0.0 || cT < sT) && (coneInfo.x < 0.0 || cT < coneInfo.x)) {
      finalT = cT;
      fIdx = 7.0;
    }
    if (coneInfo.x > 0.0 && (finalT < 0.0 || coneInfo.x < finalT) &&
        (sT < 0.0 || coneInfo.x < sT) && (cT < 0.0 || coneInfo.x < cT)) {
      finalT = coneInfo.x;
      fIdx = coneInfo.y;
    }
    assignColor(uv, finalT, i32(fIdx));
  }
}
