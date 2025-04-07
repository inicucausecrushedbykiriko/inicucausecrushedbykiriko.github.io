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

const EPSILON : f32 = 0.00000001;

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

@group(0) @binding(0) var<uniform> cameraPose: Camera;
@group(0) @binding(1) var<uniform> box: Box;
@group(0) @binding(2) var outTexture: texture_storage_2d<rgba8unorm, write>;

fn quadRayHitCheck(s: vec3f, d: vec3f, q: Quad, ct: f32) -> vec2f {
  var nt = -1.;
  if (abs(q.ll.z - q.ur.z) <= EPSILON) {
    let t = (q.ll.z - s.z) / d.z;
    if (t > 0) {
      let hPt = s + t * d;
      if (q.ll.x < hPt.x && hPt.x < q.ur.x && q.ll.y < hPt.y && hPt.y < q.ur.y) {
        nt = t;
      }
    }
  } else if (abs(q.ll.y - q.ur.y) <= EPSILON) {
    let t = (q.ll.y - s.y) / d.y;
    if (t > 0) {
      let hPt = s + t * d;
      if (q.ll.x < hPt.x && hPt.x < q.ur.x && q.ll.z < hPt.z && hPt.z < q.ur.z) {
        nt = t;
      }
    }
  } else if (abs(q.ll.x - q.ur.x) <= EPSILON) {
    let t = (q.ll.x - s.x) / d.x;
    if (t > 0) {
      let hPt = s + t * d;
      if (q.ll.y < hPt.y && hPt.y < q.ur.y && q.ll.z < hPt.z && hPt.z < q.ur.z) {
        nt = t;
      }
    }
  }
  if (nt < 0) {
    return vec2f(ct, -1);
  } else if (ct < 0) {
    return vec2f(nt, 1.);
  } else {
    if (nt < ct) {
      return vec2f(nt, 1.);
    } else {
      return vec2f(ct, -1.);
    }
  }
}

fn transformDir(d: vec3f) -> vec3f {
  var out = applyPoseToDir(d, cameraPose.pose);
  return out;
}

fn transformPt(pt: vec3f) -> vec3f {
  var out = applyPoseToPoint(pt, cameraPose.pose);
  return out;
}

fn rayBoxIntersection(s: vec3f, d: vec3f) -> vec2f {
  var t = -1.;
  var idx = -1.;
  for (var i = 0; i < 6; i++) {
    let info = quadRayHitCheck(s, d, box.faces[i], t);
    if (info.y > 0) {
      t = info.x;
      idx = f32(i);
    }
  }
  return vec2f(t, idx);
}

fn assignColor(uv: vec2i, t: f32, idx: i32) {
  var color: vec4f;
  if (t > 0) {
    switch(idx) {
      case 0: {
        color = vec4f(232./255., 119./255., 34./255., 1.);
        break;
      }
      case 1: {
        color = vec4f(255./255., 163./255., 0./255., 1.);
        break;
      }
      case 2: {
        color = vec4f(0./255., 130./255., 186./255., 1.);
        break;
      }
      case 3: {
        color = vec4f(89./255., 203./255., 232./255., 1.);
        break;
      }
      case 4: {
        color = vec4f(217./255., 217./255., 214./255., 1.);
        break;
      }
      case 5: {
        color = vec4f(167./255., 168./255., 170./255., 1.);
        break;
      }
      default: {
        color = vec4f(0., 0., 0., 1.);
        break;
      }
    }
  } else {
    color = vec4f(0./255., 56./255., 101./255., 1.);
  }
  textureStore(outTexture, uv, color);
}

@compute
@workgroup_size(16, 16)
fn computeOrthogonalMain(@builtin(global_invocation_id) global_id: vec3u) {
  let uv = vec2i(global_id.xy);
  let texDim = vec2i(textureDimensions(outTexture));
  if (uv.x < texDim.x && uv.y < texDim.y) {
    let psize = vec2f(2., 2.) / cameraPose.res.xy;
    var spt = vec3f((f32(uv.x) + 0.5) * psize.x - 1., (f32(uv.y) + 0.5) * psize.y - 1., 0.);
    var rdir = vec3f(0., 0., 1.);
    spt = transformPt(spt);
    rdir = transformDir(rdir);
    var hitInfo = rayBoxIntersection(spt, rdir);
    assignColor(uv, hitInfo.x, i32(hitInfo.y));
  }
}

@compute
@workgroup_size(16, 16)
fn computeProjectiveMain(@builtin(global_invocation_id) global_id: vec3u) {
  let uv = vec2i(global_id.xy);
  let texDim = vec2i(textureDimensions(outTexture));
  if (uv.x < texDim.x && uv.y < texDim.y) {
    // convert pixel coords to range [-1,1]
    let xNdc = (f32(uv.x) + 0.5) / cameraPose.res.x * 2. - 1.;
    let yNdc = (f32(uv.y) + 0.5) / cameraPose.res.y * 2. - 1.;
    // apply focal
    let px = xNdc / cameraPose.focal.x;
    let py = yNdc / cameraPose.focal.y;
    // origin at (0,0,0)
    var spt = vec3f(0., 0., 0.);
    // direction from origin to pixel
    var rdir = normalize(vec3f(px, py, 1.));
    spt = transformPt(spt);
    rdir = transformDir(rdir);
    var hitInfo = rayBoxIntersection(spt, rdir);
    assignColor(uv, hitInfo.x, i32(hitInfo.y));
  }
}
