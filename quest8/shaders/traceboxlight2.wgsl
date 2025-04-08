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
      return vec3f(pt[0], pt[1] * c - pt[2] * s, pt[1] * s + pt[2] * c);
    }
    case 1: { // y-axis
      return vec3f(pt[0] * c + pt[2] * s, pt[1], -pt[0] * s + pt[2] * c);
    }
    case 2: { // z-axis
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
  var nt = -1.;
  if (abs(q.ll.z - q.ur.z) <= EPSILON) { 
    let t = (q.ll.z - s.z) / d.z; 
    if (t > 0) {
      let hPt = s + t * d;
      if (q.ll.x < hPt.x && hPt.x < q.ur.x && q.ll.y < hPt.y && hPt.y < q.ur.y) {
        nt = t;
      }
    }
  }
  else if (abs(q.ll.y - q.ur.y) <= EPSILON) { 
    let t = (q.ll.y - s.y) / d.y; 
    if (t > 0) {
      let hPt = s + t * d;
      if (q.ll.x < hPt.x && hPt.x < q.ur.x && q.ll.z < hPt.z && hPt.z < q.ur.z) {
        nt = t;
      }
    }
  }
  else if (abs(q.ll.x - q.ur.x) <= EPSILON) { 
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
  }
  else if (ct < 0) {
    return vec2f(nt, 1.); 
  }
  else {
    if (nt < ct) {
      return vec2f(nt, 1.); 
    }
    else {
      return vec2f(ct, -1.); 
    }
  }
}

// a function to transform the direction to the model coordinates
fn transformDir(d: vec3f) -> vec3f {
  var out = applyPoseToDir(d, cameraPose.pose);
  return out;
}

// a function to transform the start pt to the model coordinates
fn transformPt(pt: vec3f) -> vec3f {
  var out = applyPoseToPoint(pt, cameraPose.pose);
  return out;
}

// a function to transform normal to the world coordinates
fn transformNormal(n: vec3f) -> vec3f {
  var out = n * box.scale.xyz;
  out = applyPoseToDir(out, box.pose);
  return normalize(out);
}

// a function to transform hit point to the world coordinates
fn transformHitPoint(pt: vec3f) -> vec3f {
  var out = pt * box.scale.xyz;
  out = applyPoseToPoint(out, box.pose);
  return out;
}

// a function to compute the ray box intersection
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

// a function to get the box emit color
fn boxEmitColor() -> vec4f {
  return vec4f(0, 0, 0, 1); // my box doesn't emit any color
}

// a function to get the box diffuse color
fn boxDiffuseColor(idx: i32) -> vec4f {
  var color: vec4f;
  switch(idx) {
    case 0: { 
      color = vec4f(232.f/255, 119.f/255, 34.f/255, 1.); 
      break;
    }
    case 1: { 
      color = vec4f(255.f/255, 163.f/255, 0.f/255, 1.); 
      break;
    }
    case 2: { 
      color = vec4f(0.f/255, 130.f/255, 186.f/255, 1.); 
      break;
    }
    case 3: { 
      color = vec4f(89.f/255, 203.f/255, 232.f/255, 1.); 
      break;
    }
    case 4: { 
      color = vec4f(217.f/255, 217.f/255, 214.f/255, 1.); 
      break;
    }
    case 5: { 
      color = vec4f(167.f/255, 168.f/255, 170.f/255, 1.); 
      break;
    }
    default: {
      color = vec4f(0.f/255, 0.f/255, 0.f/255, 1.); 
      break;
    }
  }
  return color;
}

// a function to get the box normal
fn boxNormal(idx: i32) -> vec3f {
  switch(idx) {
    case 0: { 
      return vec3f(0, 0, -1); 
    }
    case 1: { 
      return vec3f(0, 0, -1); 
    }
    case 2: { 
      return vec3f(-1, 0, 0); 
    }
    case 3: { 
      return vec3f(-1, 0, 0); 
    }
    case 4: { 
      return vec3f(0, -1, 0); 
    }
    case 5: { 
      return vec3f(0, -1, 0); 
    }
    default: {
      return vec3f(0, 0, 0); 
    }
  }
}

// a structure to store the computed light information
struct LightInfo {
  intensity: vec4f, 
  lightdir: vec3f, 
}

// a function to compute the light intensity and direction
fn getLightInfo(lightPos: vec3f, lightDir: vec3f, hitPoint: vec3f, objectNormal: vec3f) -> LightInfo {
  var intensity = light.intensity; 
  var dist = length(hitPoint - lightPos);
  var out: LightInfo;
  if (light.params[3] < 1.) {
    let factor = light.attenuation[0] + dist * light.attenuation[1] + dist * dist * light.attenuation[2];
    intensity /= factor;
    var viewDirection = normalize(hitPoint - lightPos);
    out.intensity = intensity * max(dot(viewDirection, -objectNormal), 0);
    out.lightdir = viewDirection;
  }
  else if (light.params[3] < 2.) {
    out.lightdir = normalize(lightDir);
    out.intensity = intensity * max(dot(out.lightdir, -objectNormal), 0);  
  }
  else if (light.params[3] < 3.) {
    var viewDirection = normalize(hitPoint - lightPos);
    let dv = abs(dot(normalize(lightDir), viewDirection));
    if (dv > cos(light.params[0])) {
      let factor = light.attenuation[0] + dist * light.attenuation[1] + dist * dist * light.attenuation[2];
      intensity /= factor;
      intensity *= pow(dv, light.params[1]);
    } else {
      intensity *= 0.;
    }
    out.intensity = intensity * max(dot(viewDirection, -objectNormal), 0);
    out.lightdir = viewDirection;
  }
  return out;
}

@group(0) @binding(4) var<uniform> shadingMode: f32; // Add this line to get shadingMode

// Implement shading models
fn lambertianShading(lightInfo: LightInfo, objectNormal: vec3f) -> vec4f {
  let diffuse = max(dot(lightInfo.lightdir, -objectNormal), 0.0);
  return lightInfo.intensity * diffuse;
}

fn phongShading(lightInfo: LightInfo, objectNormal: vec3f, viewDir: vec3f, shininess: f32) -> vec4f {
  let diffuse = max(dot(lightInfo.lightdir, -objectNormal), 0.0);
  let reflectDir = reflect(lightInfo.lightdir, objectNormal);
  let specular = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
  return lightInfo.intensity * diffuse + specular;
}

fn toneShading(lightInfo: LightInfo, objectNormal: vec3f, viewDir: vec3f, steps: i32) -> vec4f {
  let diffuse = max(dot(lightInfo.lightdir, -objectNormal), 0.0);
  let stepSize = 1.0 / f32(steps);
  let quantizedDiffuse = floor(diffuse / stepSize) * stepSize;
  return lightInfo.intensity * quantizedDiffuse;
}

// Modify the main loop to use shadingMode
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
    var hitInfo = rayBoxIntersection(spt, rdir);
    var color = vec4f(0.f/255, 56.f/255, 101.f/255, 1.);
    if (hitInfo.x > 0) {
      let emit = boxEmitColor();
      var diffuse = boxDiffuseColor(i32(hitInfo.y));
      var normal = boxNormal(i32(hitInfo.y));
      normal = transformNormal(normal);
      let lightPos = applyReversePoseToPoint(light.position.xyz, cameraPose.pose);
      let lightDir = applyReversePoseToDir(light.direction.xyz, cameraPose.pose);
      var hitPt = spt + rdir * hitInfo.x;
      hitPt = transformHitPoint(hitPt);
      let lightInfo = getLightInfo(lightPos, lightDir, hitPt, normal);
      
      if (shadingMode == 0.0) {
        color = emit + lambertianShading(lightInfo, normal);
      } else if (shadingMode == 1.0) {
        let viewDir = normalize(cameraPose.pose.pos.xyz - hitPt);
        color = emit + phongShading(lightInfo, normal, viewDir, 50.0);
      } else if (shadingMode == 2.0) {
        let viewDir = normalize(cameraPose.pose.pos.xyz - hitPt);
        color = emit + toneShading(lightInfo, normal, viewDir, 4);
      }
    }
    textureStore(outTexture, uv, color); 
  }
}

@compute
@workgroup_size(16, 16)
fn computeProjectiveMain(@builtin(global_invocation_id) global_id: vec3u) {
  // Similar logic for projective camera
}
