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

// struct to store the light
struct Light {
  intensity: vec4f,   // the light intensity
  position: vec4f,    // where the light is
  direction: vec4f,   // the light direction
  attenuation: vec4f, // the attenuation factors
  params: vec4f,      // other parameters such as cut-off, drop off, area width/height, and radius etc.
}

// binding the camera pose
@group(0) @binding(0) var<uniform> cameraPose: Camera ;
// binding the box
@group(0) @binding(1) var<uniform> box: Box;
// binding the output texture to store the ray tracing results
@group(0) @binding(2) var outTexture: texture_storage_2d<rgba8unorm, write>;
// binding the Light
@group(0) @binding(3) var<uniform> light: Light;

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

// a function to transform normal to the world coordiantes
fn transformNormal(n: vec3f) -> vec3f {
  var out = n * box.scale.xyz;
  out = applyPoseToDir(out, box.pose);
  return normalize(out);
}

// a function to transform hit point to the world coordiantes
fn transformHitPoint(pt: vec3f) -> vec3f {
  var out = pt * box.scale.xyz;
  out = applyPoseToPoint(out, box.pose);
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

// a function to get the box emit color
fn boxEmitColor() -> vec4f {
  return vec4f(0, 0, 0, 1); // my box doesn't emit any color
}

// a function to get the box diffuse color
fn boxDiffuseColor(idx: i32) -> vec4f {
  // my box has different colors for each foace
  var color: vec4f;
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
  return color;
}

// a function to get the box normal
fn boxNormal(idx: i32) -> vec3f {
  // my box's normal is facing inward as I want to see the inside instead of the outside
  // Pay attention here: how you arrange your quad vertices will affect which normal is pointing inward and which is pointing outward! The normal is always relative to how you define your model!
  // if you see your surface is black, try to flip your normal
  switch(idx) {
    case 0: { //front
      return vec3f(0, 0, -1);
    }
    case 1: { //back
      return vec3f(0, 0, -1);
    }
    case 2: { //left
      return vec3f(-1, 0, 0);
    }
    case 3: { //right
      return vec3f(-1, 0, 0);
    }
    case 4: { //top
      return vec3f(0, -1, 0);
    }
    case 5: { //down
      return vec3f(0, -1, 0);
    }
    default: {
      return vec3f(0, 0, 0);
    }
  }
}

// a structure to store the computed light information
struct LightInfo {
  intensity: vec4f, // the final light intensity
  lightdir: vec3f, // the final light direction
}

// a function to compute the light intensity and direction
fn getLightInfo(lightPos: vec3f, lightDir: vec3f, hitPoint: vec3f, objectNormal: vec3f) -> LightInfo {
  // Note: here I implemented point light - you should modify this function for different light sources
  // first, get the source intensity
  var intensity = light.intensity; 
  // then, compute the distance between the light source and the hit point
  var dist = length(hitPoint - lightPos);
  // final light info
  var out: LightInfo;
  if (light.params[3] < 1.) {
    // next, compute the attenuation factor
    let factor = light.attenuation[0] + dist * light.attenuation[1] + dist * dist * light.attenuation[2];
    // now reduce the light intenstiy using the factor
    intensity /= factor;
    // compute the view direction
    var viewDirection = normalize(hitPoint - lightPos);
    // the final light intensity depends on the view direction
    out.intensity = intensity * max(dot(viewDirection, -objectNormal), 0);
    // the final light diretion is the current view direction
    out.lightdir = viewDirection;
  }
  else if (light.params[3] < 2.) {
    out.lightdir = normalize(lightDir);
    out.intensity = intensity * max(dot(out.lightdir, -objectNormal), 0);  
  }
  else if (light.params[3] < 3.) {
    var viewDirection = normalize(hitPoint - lightPos);
    let dv = abs(dot(normalize(lightDir), viewDirection));
    if (dv > cos(light.params[0])) 
    {
      let factor = light.attenuation[0] + dist * light.attenuation[1] + dist * dist * light.attenuation[2];
      intensity /= factor;
      intensity *= pow(dv, light.params[1]);
    }
    else {
      intensity *= 0.;
    }
    out.intensity = intensity * max(dot(viewDirection, -objectNormal), 0);
    out.lightdir = viewDirection;
  }
  return out;
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
    var color = vec4f(0.f/255, 56.f/255, 101.f/255, 1.); // Bucknell Blue
    if (hitInfo.x > 0) { // if there is a hit
      // here, I provide you with the Lambertian shading implementation
      // You need to modify it for other shading model
      // first, get the emit color
      let emit = boxEmitColor();
      // then, compute the diffuse color, which depends on the light source
      //   1. get the box diffuse color - i.e. the material property of diffusion on the box
      var diffuse = boxDiffuseColor(i32(hitInfo.y)); // get the box diffuse property
      //   2. get the box normal
      var normal = boxNormal(i32(hitInfo.y));
      //   3. transform the normal to the world coordinates
      //   Note: here it is using the box pose/motor and scale. 
      //         you will need to modify this transformation for different objects
      normal = transformNormal(normal);
      //   4. transform the light to the world coordinates
      //   Note: My light is stationary, so Icancel the camera movement to keep it stationary
      let lightPos = applyReversePoseToPoint(light.position.xyz, cameraPose.pose);
      let lightDir = applyReversePoseToDir(light.direction.xyz, cameraPose.pose);
      //   5. transform the hit point to the world coordiantes
      //   Note: the hit point is in the model coordiantes, need to transform back to the world
      var hitPt = spt + rdir * hitInfo.x;
      hitPt = transformHitPoint(hitPt);
      //   6. compute the light information
      //   Note: I do the light computation in the world coordiantes because the light intensity depends on the distance and angles in the world coordiantes! If you do it in other coordinate system, make sure you transform them properly back to the world one.
      let lightInfo = getLightInfo(lightPos, lightDir, hitPt, normal);
      //   7. finally, modulate the diffuse color by the light
      diffuse *= lightInfo.intensity;
      // last, compute the final color. Here Lambertian = emit + diffuse
      color = emit + diffuse;
      // Note: I do not use lightInfo.lightdir here, but you will need it for Phong and tone shading
      
    }
    // set the final color to the pixel
    textureStore(outTexture, uv, color); 
  }
}

@compute
@workgroup_size(16, 16)
fn computeProjectiveMain(@builtin(global_invocation_id) global_id: vec3u) {
  // TODO: copy your code of quest 6 here
  // This should be very similar to the orthogonal one above
}
