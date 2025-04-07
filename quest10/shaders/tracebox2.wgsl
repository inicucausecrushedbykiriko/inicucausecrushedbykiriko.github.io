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
}

// struct to store a quad vertices
struct Quad {
  ll: vec4f, // lower left
  lr: vec4f, // lower right
  ur: vec4f, // upper right
  ul: vec4f, // upper left
}

// struct to store the box
struct Box {
  pose: Pose,     // the model pose of the box
  scale: vec4f,           // the scale of the box
  faces: array<Quad, 6>,  // six faces: front, back, left, right, top, down
}

// binding the camera pose
@group(0) @binding(0) var<uniform> cameraPose: Camera ;
// binding the box
@group(0) @binding(1) var<uniform> box: Box;
// binding the output texture to store the ray tracing results
@group(0) @binding(2) var outTexture: texture_storage_2d<rgba8unorm, write>;

// a helper function to get the hit point of a ray to a axis-aligned quad
fn quadRayHitCheck(s: vec3f, d: vec3f, q: Quad, ct: f32) -> vec2f {
  // Note, the quad is axis aligned
  // Step 1: Check if the hit point within the face
  var nt = -1.;
  if (abs(q.ll.z - q.ur.z) <= EPSILON) { // z is 0, i.e. front or back face
    let t = (q.ll.z - s.z) / d.z; // compute the current hit point to the check value
    if (t > 0) {
      let hPt = s + t * d;
      if (q.ll.x < hPt.x && hPt.x < q.ur.x && q.ll.y < hPt.y && hPt.y < q.ur.y) {
        nt = t;
      }
    }
  }
  else if (abs(q.ll.y - q.ur.y) <= EPSILON) { // y is 0, i.e. top or down face
    let t = (q.ll.y - s.y) / d.y; // compute the current hit point to the check value
    if (t > 0) {
      let hPt = s + t * d;
      if (q.ll.x < hPt.x && hPt.x < q.ur.x && q.ll.z < hPt.z && hPt.z < q.ur.z) {
        nt = t;
      }
    }
  }
  else if (abs(q.ll.x - q.ur.x) <= EPSILON) { // x is 0, i.e. left or right face
    let t = (q.ll.x - s.x) / d.x; // compute the current hit point to the check value
    if (t > 0) {
      let hPt = s + t * d;
      if (q.ll.y < hPt.y && hPt.y < q.ur.y && q.ll.z < hPt.z && hPt.z < q.ur.z) {
        nt = t;
      }
    }
  }
  
  // return the hit cases
  if (nt < 0) {
    return vec2f(ct, -1); // Case 1: the ray has already passed the face, no hit
  }
  else if (ct < 0) {
    return vec2f(nt, 1.); // Case 2: the first hit is nt, and say it hits the new face
  }
  else {
    if (nt < ct) {
      return vec2f(nt, 1.); // Case 3: the closer is nt, and say it hits the new face first
    }
    else {
      return vec2f(ct, -1.); // Case 4: the closer is ct, and say it hits the old face first
    }
  }
}

// a function to transform the direction to the model coordiantes
fn transformDir(d: vec3f) -> vec3f {
  // transform the direction using the camera pose
  var out = applyPoseToDir(d, cameraPose.pose);
  // transform it using the object pose if you have any. Here we assume no object pose
  return out;
}

// a function to transform the start pt to the model coordiantes
fn transformPt(pt: vec3f) -> vec3f {
  // transform the point using the camera pose
  var out = applyPoseToPoint(pt, cameraPose.pose);
  // transform it using the object pose if you have any. Here we assume no object pose
  return out;
}

// a function to compute the ray box intersection
fn rayBoxIntersection(s: vec3f, d: vec3f) -> vec2f { // output is (t, idx)
  // t is the hit value, idx is the fact it hits
  // here we have six planes to check and we keep the cloest hit point
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

// a function to asign the pixel color
fn assignColor(uv: vec2i, t: f32, idx: i32) {
  var color: vec4f;
  if (t > 0) { // hit 
    switch(idx) {
      case 0: { //front
        color = vec4f(232.f/255, 119.f/255, 34.f/255, 1.); // Bucknell Orange 1
        break;
      }
      case 1: { //back
        color = vec4f(255.f/255, 163.f/255, 0.f/255, 1.); // Bucknell Orange 2
        break;
      }
      case 2: { //left
        color = vec4f(0.f/255, 130.f/255, 186.f/255, 1.); // Bucknell Blue 2
        break;
      }
      case 3: { //right
        color = vec4f(89.f/255, 203.f/255, 232.f/255, 1.); // Bucknell Blue 3
        break;
      }
      case 4: { //top
        color = vec4f(217.f/255, 217.f/255, 214.f/255, 1.); // Bucknell gray 1
        break;
      }
      case 5: { //down
        color = vec4f(167.f/255, 168.f/255, 170.f/255, 1.); // Bucknell gray 2
        break;
      }
      default: {
        color = vec4f(0.f/255, 0.f/255, 0.f/255, 1.); // Black
        break;
      }
    }
  }
  else { // no hit
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
    // compute the intersection to the object
    var hitInfo = rayBoxIntersection(spt, rdir);
    // assign colors
    assignColor(uv, hitInfo.x, i32(hitInfo.y));
  }
}

@compute
@workgroup_size(16, 16)
fn computeProjectiveMain(@builtin(global_invocation_id) global_id: vec3u) {
  // TODO: write code to generate projection camera ray and trace the ray to assign the pixel color
  // This should be very similar to the orthogonal one above
  
  
}
