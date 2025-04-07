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

// a helper function to get the hit point of a ray to a triangle
fn triangleRayHitCheck(p: vec3f, d: vec3f, v0: vec3f, v1: vec3f, v2: vec3f, ct: f32) -> vec4f {
  // every point on the triangle can be written as: pt = v0 + u * (v1 - v0) + v * (v2 - v0) or w * v0 + u * v1 + v * v2 where w = 1 - u - v
  // let e1 = v1 - v0 and e2 = v2 - v0 and ep = p - v0
  let e1 = v1 - v0;
  let e2 = v2 - v0;
  let ep = p - v0;
  // so, if pt = p + t * d is on the triangle, we have ep + t * d = u * e1 + v * e2
  // we can use cross(e1, e2) to find the normal of the plane
  let n = normalize(cross(e1, e2));
  // now, note that e1/2 project, using dot(), on n should be 0 because they are perpendicular
  // i.e. we have dot(ep, n) + t * dot(d, n) = 0 => t = -dot(ep, n) / dot(d, n)
  let det = dot(d, n);
  if (abs(det) < EPSILON) { // ray and normal are perpendicular, i.e. ray and triangle is in parallel
    return vec4f(ct, -1., -1., -1.); // no hit
  }
  // compute the new hit value
  let t = -dot(ep, n) / det;

  if (t > EPSILON) { // intersecting the plane of the triangle
    // check if it is within the triangle by computing u and v
    // note that if we project the edge to each other, we have 
    //   dot(ep + t * d, e1) = u * dot(e1, e1) + v * dot(e1, e2)
    //   dot(ep + t * d, e2) = u * dot(e1, e2) + v * dot(e2, e2)
    // we have two equations and two unknown (u, v)
    // we can solve it by direct substitution
    //  First multiply first by dot(e1, e2) and second by dot(e1, e1)
    //   dot(ep + t * d, e1) * dot(e1, e2) = u * dot(e1, e1) * dot(e1, e2) + v * dot(e1, e2) * dot(e1, e2)
    //   dot(ep + t * d, e2) * dot(e1, e1) = u * dot(e1, e2) * dot(e1, e1) + v * dot(e2, e2) * dot(e1, e1)
    // substract them, we have:
    //  v = [dot(ep + t * d, e1) * dot(e1, e2) - dot(ep + t * d, e2) * dot(e1, e1)] / [dot(e1, e2) * dot(e1, e2) - dot(e2, e2) * dot(e1, e1)]
    let v = (dot(ep + t * d, e1) * dot(e1, e2) - dot(ep + t * d, e2) * dot(e1, e1)) / (dot(e1, e2) * dot(e1, e2) - dot(e2, e2) * dot(e1, e1));
    let u = (dot(ep + t * d, e1) - v * dot(e1, e2)) / dot(e1, e1);
    // if the hit point is in the triangle only if u and v are both > 0 and < 1 and their sum are also withint 0 and 1
    let w = 1.0 - u - v;
    if (u < 0.0 || u > 1.0) { return vec4f(ct, -1., -1., -1.); }
    if (v < 0.0 || v > 1.0) { return vec4f(ct, -1., -1., -1.); }
    if (w < 0.0 || w > 1.0) { return vec4f(ct, -1., -1., -1.); }
    
    // return the hit cases
    if (t < 0) {
      return vec4f(ct, -1, -1., -1.); // Case 1: the ray has already passed the face, no hit
    }
    else if (ct < 0) {
      return vec4f(t, 1., u, v); // Case 2: the first hit is nt, and say it hits the new face
    }
    else {
      if (t < ct) {
        return vec4f(t, 1., u, v); // Case 3: the closer is nt, and say it hits the new face first
      }
      else {
        return vec4f(ct, -1., -1., -1.); // Case 4: the closer is ct, and say it hits the old face first
      }
    }
  }
  return vec4f(ct, -1., -1., -1.); // Default Case: no hit
}

// struct to store camera
struct Camera {
  pose: Pose,
  focal: vec2f,
  res: vec2f,
}

@group(0) @binding(0) var<uniform> cameraPose: Camera;               // camera pose
@group(0) @binding(1) var<storage> vertices: array<array<f32, 6>>;   // vertices
@group(0) @binding(2) var<storage> triangles: array<u32>;            // triangles
@group(0) @binding(3) var outTexture: texture_storage_2d<rgba8unorm, write>;

// a function to trace the triangle mesh and get the color
fn getColor(p: vec3f, d: vec3f) -> vec4f {
  var color = vec4f(0.f/255, 56.f/255, 101.f/255, 1.);
  
  var t = -1.;
  var minIdx = -1;
  var normal = vec3f(0, 0, 0);
  var weights = vec3f(0, 0, 0);
  for (var i = 0; i < i32(arrayLength(&triangles)); i = i + 3) { // for every three vertices
    let v0 = vec3f(vertices[triangles[i    ]][0], vertices[triangles[i    ]][1], vertices[triangles[i    ]][2]);
    let v1 = vec3f(vertices[triangles[i + 1]][0], vertices[triangles[i + 1]][1], vertices[triangles[i + 1]][2]);
    let v2 = vec3f(vertices[triangles[i + 2]][0], vertices[triangles[i + 2]][1], vertices[triangles[i + 2]][2]);
    let info = triangleRayHitCheck(p, d, v0, v1, v2, t);
    if (info.y >= -EPSILON) {
      t = info.x;
      minIdx = i;
      weights = vec3f(1 - info.z - info.w, info.z, info.w);
    }
  }
  
  if (minIdx >= 0) {
    let n0 = vec3f(vertices[triangles[minIdx    ]][3], vertices[triangles[minIdx    ]][4], vertices[triangles[minIdx    ]][5]);
    let n1 = vec3f(vertices[triangles[minIdx + 1]][3], vertices[triangles[minIdx + 1]][4], vertices[triangles[minIdx + 1]][5]);
    let n2 = vec3f(vertices[triangles[minIdx + 2]][3], vertices[triangles[minIdx + 2]][4], vertices[triangles[minIdx + 2]][5]);
    normal = normalize(weights.x * n0 + weights.y * n1 + weights.z * n2); // interpolate the normal
    color = vec4f((normal + 1) * 0.5, 1);
  }
  
  return color;
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
    spt = applyPoseToPoint(spt, cameraPose.pose);
    rdir = applyPoseToDir(rdir, cameraPose.pose);
    // compute the intersection to the object
    var color = getColor(spt, rdir);
    // assign colors
    textureStore(outTexture, uv, color);  
  }
}

@compute
@workgroup_size(16, 16)
fn computeProjectiveMain(@builtin(global_invocation_id) global_id: vec3u) {
  // TODO: modify/copy your projective ray tracing code here
  
  
}