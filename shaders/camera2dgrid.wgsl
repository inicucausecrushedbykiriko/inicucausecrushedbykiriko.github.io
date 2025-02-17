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

// struct to store a multi vector
struct MultiVector {
  s: f32,
  e01: f32,
  eo0: f32,
  eo1: f32
};

// struct to store 2D Camera pose
struct Pose {
  motor: MultiVector,
  scale: vec2f
};

fn geometricProduct(a: MultiVector, b: MultiVector) -> MultiVector {
  // ref: https://geometricalgebratutorial.com/pga/
  // eoo = 0, e00 = 1 e11 = 1
  // s + e01 + eo0 + eo1
  // ss   = s   , se01   = e01  , seo0            = eo0  , seo1          = eo1
  // e01s = e01 , e01e01 = -s   , e01eo0 = e10e0o = -eo1 , e01eo1 = -e0o = eo0
  // eo0s = eo0 , eo0e01 = eo1  , eo0eo0          = 0    , eo0eo1        = 0
  // e01s = e01 , eo1e01 = -eo0 , eo1eo0          = 0    , eo1eo1        = 0
  return MultiVector(
    a.s * b.s   - a.e01 * b.e01 , // scalar
    a.s * b.e01 + a.e01 * b.s   , // e01
    a.s * b.eo0 + a.e01 * b.eo1 + a.eo0 * b.s   - a.eo1 * b.e01, // eo0
    a.s * b.eo1 - a.e01 * b.eo0 + a.eo0 * b.e01 + a.eo1 * b.s    // eo1
  );
}
fn reverse(a: MultiVector) -> MultiVector {
  return MultiVector( a.s, -a.e01, -a.eo0, -a.eo1 );
}

fn applyMotor(p: MultiVector, m: MultiVector) -> MultiVector {
  return geometricProduct(m, geometricProduct(p, reverse(m)));
}

fn applyMotorToPoint(p: vec2f, m: MultiVector) -> vec2f {
  // ref: https://geometricalgebratutorial.com/pga/
  // Three basic vectors e0, e1 and eo (origin)
  // Three basic bi-vectors e01, eo0, eo1
  // p = 0 1 + 1 e_01 - x e_o1 + y e_o0 
  // m = c 1 + s e_01 + dx / 2 e_o0 - dy / 2 e_o1 
  let new_p = applyMotor(MultiVector(0, 1, p[0], p[1]), m);
  return vec2f(new_p.eo0 / new_p.e01, new_p.eo1 / new_p.e01);
}

@group(0) @binding(0) var<uniform> camerapose: Pose;

@vertex // this compute the scene coordinate of each input vertex
fn vertexMain(@location(0) pos: vec2f, @builtin(instance_index) idx: u32) -> @builtin(position) vec4f {
  let u = idx % 10; // we are expecting 10x10, so modulo 10 to get the x index
  let v = idx / 10; // divide by 10 to get the y index
  let uv = vec2f(f32(u), f32(v)) / 10; // normalize the coordinates to [0, 1]
  let halfLength = 1.f; // half cell length
  let cellLength = halfLength * 2.f; // full cell length
  let cell = pos / 10; // divide the input quad into 10x10 pieces
  let offset = - halfLength + uv * cellLength + cellLength / 10 * 0.5; // compute the offset for the instance
  // Apply motor
  let transformed = applyMotorToPoint(cell + offset, reverse(camerapose.motor));
  // Apply scale
  let scaled = transformed * camerapose.scale;
  return vec4f(scaled, 0, 1); // (pos, Z, W) = (X, Y, Z, W)
}

@fragment // this compute the color of each pixel
fn fragmentMain() -> @location(0) vec4f {
  return vec4f(238.f/255, 118.f/255, 35.f/255, 1); // (R, G, B, A)
}