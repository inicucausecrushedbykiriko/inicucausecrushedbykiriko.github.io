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
  pos: vec4f,    // [x, y, z, 1 padding]
  angles: vec4f, // [rx, ry, rz, 1 padding]
}

fn translate(pt: vec3f, dx: f32, dy: f32, dz: f32) -> vec3f {
  return vec3f(pt.x + dx, pt.y + dy, pt.z + dz);
}

fn rotate(pt: vec3f, axis: i32, angle: f32) -> vec3f {
  let c = cos(angle);
  let s = sin(angle);
  switch (axis) {
    case 0: {  // x-axis
      return vec3f(pt.x, pt.y * c - pt.z * s, pt.y * s + pt.z * c);
    }
    case 1: {  // y-axis
      return vec3f(pt.x * c + pt.z * s, pt.y, -pt.x * s + pt.z * c);
    }
    case 2: {  // z-axis
      return vec3f(pt.x * c - pt.y * s, pt.x * s + pt.y * c, pt.z);
    }
    default: {
      return pt;
    }
  }
}

// Applies pose forward to point
fn applyPoseToPoint(pt: vec3f, pose: Pose) -> vec3f {
  var out = rotate(pt, 0, pose.angles.x);
  out = rotate(out, 1, pose.angles.y);
  out = rotate(out, 2, pose.angles.z);
  out = translate(out, pose.pos.x, pose.pos.y, pose.pos.z);
  return out;
}

// Applies pose forward to direction
fn applyPoseToDir(dir: vec3f, pose: Pose) -> vec3f {
  var out = rotate(dir, 0, pose.angles.x);
  out = rotate(out, 1, pose.angles.y);
  out = rotate(out, 2, pose.angles.z);
  return out;
}

// Applies pose **reverse** to point
fn applyReversePoseToPoint(pt: vec3f, pose: Pose) -> vec3f {
  // Opposite order: translate by -pos, rotate in reverse order/angle
  var out = translate(pt, -pose.pos.x, -pose.pos.y, -pose.pos.z);
  out = rotate(out, 2, -pose.angles.z);
  out = rotate(out, 1, -pose.angles.y);
  out = rotate(out, 0, -pose.angles.x);
  return out;
}

// Applies pose **reverse** to direction
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
  ll: vec4f, // lower-left corner
  lr: vec4f, // lower-right
  ur: vec4f, // upper-right
  ul: vec4f, // upper-left
}

struct Box {
  pose: Pose,        // box's model pose
  scale: vec4f,      // scale factor
  faces: array<Quad, 6>,
}

@group(0) @binding(0) var<uniform> cameraPose: Camera;
@group(0) @binding(1) var<uniform> box: Box;
@group(0) @binding(2) var outTexture: texture_storage_2d<rgba8unorm, write>;

// Axis-aligned quad intersection
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

// We transform from world coordinates => camera => object local
fn transformRayToLocalSpace(startPt: vec3f, dir: vec3f) -> array<vec3f, 2> {
  // 1) Apply the camera’s forward transform to s/d
  let sCam = applyPoseToPoint(startPt, cameraPose.pose);
  let dCam = applyPoseToDir(dir, cameraPose.pose);

  // 2) Then apply the box’s reverse transform to s/d
  let sLocal = applyReversePoseToPoint(sCam, box.pose);
  let dLocal = applyReversePoseToDir(dCam, box.pose);

  return array<vec3f, 2>(sLocal, dLocal);
}

// Ray-box intersection in local space
fn rayBoxIntersection(startPt: vec3f, dir: vec3f) -> vec2f {
  var t = -1.0;
  var idx = -1.0;
  for (var i = 0; i < 6; i++) {
    let info = quadRayHitCheck(startPt, dir, box.faces[i], t);
    if (info.y > 0.0) {
      t = info.x;
      idx = f32(i);
    }
  }
  return vec2f(t, idx);
}

fn assignColor(uv: vec2i, t: f32, faceIndex: i32) {
  var c: vec4f;
  if (t > 0.0) {
    switch(faceIndex) {
      case 0: { c = vec4f(232./255., 119./255., 34./255., 1.); break; }
      case 1: { c = vec4f(255./255., 163./255., 0./255., 1.); break; }
      case 2: { c = vec4f(0./255., 130./255., 186./255., 1.); break; }
      case 3: { c = vec4f(89./255., 203./255., 232./255., 1.); break; }
      case 4: { c = vec4f(217./255., 217./255., 214./255., 1.); break; }
      case 5: { c = vec4f(167./255., 168./255., 170./255., 1.); break; }
      default: { c = vec4f(0., 0., 0., 1.); break; }
    }
  } else {
    c = vec4f(0./255., 56./255., 101./255., 1.);
  }
  textureStore(outTexture, uv, c);
}

@compute
@workgroup_size(16, 16)
fn computeOrthogonalMain(@builtin(global_invocation_id) global_id: vec3u) {
  let uv = vec2i(global_id.xy);
  let texDim = vec2i(textureDimensions(outTexture));

  if (uv.x < texDim.x && uv.y < texDim.y) {
    // Pixel size in [-1,1]
    let psize = vec2f(2., 2.) / cameraPose.res;
    var startPt = vec3f(
      (f32(uv.x) + 0.5) * psize.x - 1.,
      (f32(uv.y) + 0.5) * psize.y - 1.,
      0.
    );
    var dir = vec3f(0., 0., 1.);

    let localRay = transformRayToLocalSpace(startPt, dir);
    let hitInfo = rayBoxIntersection(localRay[0], localRay[1]);
    assignColor(uv, hitInfo.x, i32(hitInfo.y));
  }
}

@compute
@workgroup_size(16, 16)
fn computeProjectiveMain(@builtin(global_invocation_id) global_id: vec3u) {
  let uv = vec2i(global_id.xy);
  let texDim = vec2i(textureDimensions(outTexture));

  if (uv.x < texDim.x && uv.y < texDim.y) {
    // Transform pixel coords into [-1,1]
    let xNdc = (f32(uv.x) + 0.5) / cameraPose.res.x * 2. - 1.;
    let yNdc = (f32(uv.y) + 0.5) / cameraPose.res.y * 2. - 1.;
    // Adjust by camera focal
    let px = xNdc / cameraPose.focal.x;
    let py = yNdc / cameraPose.focal.y;

    var startPt = vec3f(0., 0., 0.);
    var dir = normalize(vec3f(px, py, 1.));

    let localRay = transformRayToLocalSpace(startPt, dir);
    let hitInfo = rayBoxIntersection(localRay[0], localRay[1]);
    assignColor(uv, hitInfo.x, i32(hitInfo.y));
  }
}
