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

struct Light {
  intensity: vec4f,
  position: vec4f,
  direction: vec4f,
  attenuation: vec4f,
  params: vec4f,
}

struct ShadowMode {
  mode: i32,
}

@group(0) @binding(0) var<uniform> cameraPose: Camera;
@group(0) @binding(1) var<uniform> box: Box;
@group(0) @binding(2) var outTexture: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(3) var<uniform> light: Light;
@group(0) @binding(4) var<uniform> shadowMode: ShadowMode;

fn quadRayHitCheck(s: vec3f, d: vec3f, q: Quad, ct: f32) -> vec2f {
  var nt = -1.0;
  if (abs(q.ll.z - q.ur.z) <= EPSILON) {
    let t = (q.ll.z - s.z) / d.z;
    if (t > 0.0) {
      let hPt = s + t * d;
      if (q.ll.x < hPt.x && hPt.x < q.ur.x && q.ll.y < hPt.y && hPt.y < q.ur.y) {
        nt = t;
      }
    }
  } else if (abs(q.ll.y - q.ur.y) <= EPSILON) {
    let t = (q.ll.y - s.y) / d.y;
    if (t > 0.0) {
      let hPt = s + t * d;
      if (q.ll.x < hPt.x && hPt.x < q.ur.x && q.ll.z < hPt.z && hPt.z < q.ur.z) {
        nt = t;
      }
    }
  } else if (abs(q.ll.x - q.ur.x) <= EPSILON) {
    let t = (q.ll.x - s.x) / d.x;
    if (t > 0.0) {
      let hPt = s + t * d;
      if (q.ll.y < hPt.y && hPt.y < q.ur.y && q.ll.z < hPt.z && hPt.z < q.ur.z) {
        nt = t;
      }
    }
  }
  if (nt < 0.0) {
    return vec2f(ct, -1.0);
  } else if (ct < 0.0) {
    return vec2f(nt, 1.0);
  } else {
    if (nt < ct) {
      return vec2f(nt, 1.0);
    } else {
      return vec2f(ct, -1.0);
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

fn transformNormal(n: vec3f) -> vec3f {
  var out = n * box.scale.xyz;
  out = applyPoseToDir(out, box.pose);
  return normalize(out);
}

fn transformHitPoint(pt: vec3f) -> vec3f {
  var out = pt * box.scale.xyz;
  out = applyPoseToPoint(out, box.pose);
  return out;
}

fn rayBoxIntersection(s: vec3f, d: vec3f) -> vec2f {
  var t = -1.0;
  var idx = -1.0;
  for (var i: i32 = 0; i < 6; i = i + 1) {
    let info = quadRayHitCheck(s, d, box.faces[i], t);
    if (info.y > 0.0) {
      t = info.x;
      idx = f32(i);
    }
  }
  return vec2f(t, idx);
}

fn boxEmitColor() -> vec4f {
  return vec4f(0.0, 0.0, 0.0, 1.0);
}

fn boxDiffuseColor(idx: i32) -> vec4f {
  var color: vec4f;
  switch(idx) {
    case 0: { color = vec4f(232.0/255.0, 119.0/255.0, 34.0/255.0, 1.0); break; }
    case 1: { color = vec4f(255.0/255.0, 163.0/255.0, 0.0/255.0, 1.0); break; }
    case 2: { color = vec4f(0.0/255.0, 130.0/255.0, 186.0/255.0, 1.0); break; }
    case 3: { color = vec4f(89.0/255.0, 203.0/255.0, 232.0/255.0, 1.0); break; }
    case 4: { color = vec4f(217.0/255.0, 217.0/255.0, 214.0/255.0, 1.0); break; }
    case 5: { color = vec4f(167.0/255.0, 168.0/255.0, 170.0/255.0, 1.0); break; }
    default: { color = vec4f(0.0, 0.0, 0.0, 1.0); break; }
  }
  return color;
}

fn boxNormal(idx: i32) -> vec3f {
  switch(idx) {
    case 0: { return vec3f(0.0, 0.0, -1.0); }
    case 1: { return vec3f(0.0, 0.0, -1.0); }
    case 2: { return vec3f(-1.0, 0.0, 0.0); }
    case 3: { return vec3f(-1.0, 0.0, 0.0); }
    case 4: { return vec3f(0.0, -1.0, 0.0); }
    case 5: { return vec3f(0.0, -1.0, 0.0); }
    default: { return vec3f(0.0, 0.0, 0.0); }
  }
}

struct LightInfo {
  intensity: vec4f,
  lightdir: vec3f,
}

fn getLightInfo(lightPos: vec3f, lightDir: vec3f, hitPoint: vec3f, objectNormal: vec3f) -> LightInfo {
  var intensity = light.intensity;
  var dist = length(hitPoint - lightPos);
  var out: LightInfo;
  if (light.params[3] < 1.0) {
    let factor = light.attenuation[0] + dist * light.attenuation[1] + dist * dist * light.attenuation[2];
    intensity = intensity / factor;
    var viewDirection = normalize(hitPoint - lightPos);
    out.intensity = intensity * max(dot(viewDirection, -objectNormal), 0.0);
    out.lightdir = viewDirection;
  } else if (light.params[3] < 2.0) {
    out.lightdir = normalize(lightDir);
    out.intensity = intensity * max(dot(out.lightdir, -objectNormal), 0.0);
  } else if (light.params[3] < 3.0) {
    var viewDirection = normalize(hitPoint - lightPos);
    let dv = abs(dot(normalize(lightDir), viewDirection));
    if (dv > cos(light.params[0])) {
      let factor = light.attenuation[0] + dist * light.attenuation[1] + dist * dist * light.attenuation[2];
      intensity = intensity / factor;
      intensity = intensity * pow(dv, light.params[1]);
    } else {
      intensity = intensity * 0.0;
    }
    out.intensity = intensity * max(dot(viewDirection, -objectNormal), 0.0);
    out.lightdir = viewDirection;
  }
  return out;
}

fn hardShadow(hit: vec3f, ldir: vec3f) -> f32 {
  let eps = 0.001;
  let ro = hit + ldir * eps;
  let shadowHit = rayBoxIntersection(ro, ldir);
  if (shadowHit.x > 0.0) { return 0.1; }
  return 1.0;
}

fn pcfShadow(hit: vec3f, ldir: vec3f) -> f32 {
  let eps = 0.001;
  var sum: f32 = 0.0;
  let samples = 4;
  for (var i: i32 = 0; i < samples; i = i + 1) {
    let offset = vec3f(f32(i) * 0.001, f32((i+1) % 2) * 0.001, 0.0);
    let ro = hit + ldir * eps + offset;
    let shadowHit = rayBoxIntersection(ro, ldir);
    if (shadowHit.x > 0.0) {
      sum = sum + 0.1;
    } else {
      sum = sum + 1.0;
    }
  }
  return sum / f32(samples);
}

fn sdfShadow(hit: vec3f, ldir: vec3f, maxT: f32) -> f32 {
  var t: f32 = 0.0;
  var shadowFactor = 1.0;
  let eps = 0.001;
  for (var i: i32 = 0; i < 50; i = i + 1) {
    let pos = hit + ldir * t;
    let d = abs(pos) - vec3f(0.5, 0.5, 0.5);
    let dm = max(d, vec3f(0.0, 0.0, 0.0));
    let sdfVal = length(dm) + min(max(d.x, max(d.y, d.z)), 0.0);
    shadowFactor = min(shadowFactor, pow(sdfVal / maxT, 0.85));
    t = t + max(sdfVal, 0.001);
    if (t >= maxT) { break; }
  }
  return max(shadowFactor, 0.1);
}

fn areaShadow(hit: vec3f, ldir: vec3f) -> f32 {
  let samples: i32 = 4;
  var total: f32 = 0.0;
  let lightAreaSize: f32 = 0.1;
  for (var i: i32 = 0; i < samples; i = i + 1) {
    var offset: vec3f = vec3f(0.0, 0.0, 0.0);
    if (i == 0) { offset = vec3f(-lightAreaSize, -lightAreaSize, 0.0); }
    else if (i == 1) { offset = vec3f(lightAreaSize, -lightAreaSize, 0.0); }
    else if (i == 2) { offset = vec3f(-lightAreaSize, lightAreaSize, 0.0); }
    else if (i == 3) { offset = vec3f(lightAreaSize, lightAreaSize, 0.0); }
    let lightPosSample = light.position.xyz + offset;
    let newLdir = normalize(lightPosSample - hit);
    let s = hit + newLdir * 0.001;
    let shadowHit = rayBoxIntersection(s, newLdir);
    if (shadowHit.x > 0.0) {
      total = total + 0.1;
    } else {
      total = total + 1.0;
    }
  }
  return total / f32(samples);
}

fn distanceShadow(hit: vec3f, ldir: vec3f) -> f32 {
  let eps = 0.001;
  let ro = hit + ldir * eps;
  let shadowHit = rayBoxIntersection(ro, ldir);
  if (shadowHit.x > 0.0) {
    let shadowFactor = pow(min(shadowHit.x, 1.0), 0.85);
    return max(shadowFactor, 0.1);
  }
  return 1.0;
}

fn commonCompute(global_id: vec3u) {
  let uv = vec2i(global_id.xy);
  let texDim = vec2i(textureDimensions(outTexture));
  if (uv.x < texDim.x && uv.y < texDim.y) {
    let psize = vec2f(2.0, 2.0) / cameraPose.res;
    var spt = vec3f((f32(uv.x) + 0.5) * psize.x - 1.0, (f32(uv.y) + 0.5) * psize.y - 1.0, 0.0);
    var rdir = vec3f(0.0, 0.0, 1.0);
    spt = transformPt(spt);
    rdir = transformDir(rdir);
    var hitInfo = rayBoxIntersection(spt, rdir);
    var color = vec4f(0.0/255.0, 56.0/255.0, 101.0/255.0, 1.0);
    if (hitInfo.x > 0.0) {
      let emit = boxEmitColor();
      var diffuse = boxDiffuseColor(i32(hitInfo.y));
      var normal = boxNormal(i32(hitInfo.y));
      normal = transformNormal(normal);
      let lightPos = applyReversePoseToPoint(light.position.xyz, cameraPose.pose);
      let lightDir = applyReversePoseToDir(light.direction.xyz, cameraPose.pose);
      var hitPt = spt + rdir * hitInfo.x;
      hitPt = transformHitPoint(hitPt);
      let lightInfo = getLightInfo(lightPos, lightDir, hitPt, normal);
      var shadowAtten: f32 = 1.0;
      if (shadowMode.mode == 0) {
        shadowAtten = hardShadow(hitPt, -lightDir);
      } else if (shadowMode.mode == 1) {
        shadowAtten = pcfShadow(hitPt, -lightDir);
      } else if (shadowMode.mode == 2) {
        shadowAtten = sdfShadow(hitPt, -lightDir, 1.0);
      } else if (shadowMode.mode == 3) {
        shadowAtten = areaShadow(hitPt, -lightDir);
      } else if (shadowMode.mode == 4) {
        shadowAtten = distanceShadow(hitPt, -lightDir);
      }
      diffuse = diffuse * (lightInfo.intensity * shadowAtten);
      color = emit + diffuse;
    }
    textureStore(outTexture, uv, color);
  }
}

@compute @workgroup_size(16,16)
fn computeOrthogonalMain(@builtin(global_invocation_id) global_id: vec3u) {
  commonCompute(global_id);
}

@compute @workgroup_size(16,16)
fn computeProjectiveMain(@builtin(global_invocation_id) global_id: vec3u) {
  commonCompute(global_id);
}
