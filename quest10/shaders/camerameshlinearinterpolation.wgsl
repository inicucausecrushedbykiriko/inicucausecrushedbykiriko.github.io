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

// struct to sture 3D PGA multivector
struct MultiVector {
  s: f32, 
  exey: f32, 
  exez: f32, 
  eyez: f32, 
  eoex: f32, 
  eoey: f32, 
  eoez: f32, 
  exeyez: f32, 
  eoexey: f32, 
  eoexez: f32, 
  eoeyez: f32,
  ex: f32, 
  ey: f32, 
  ez: f32, 
  eo: f32,
  eoexeyez: f32
}

// the geometric product 
fn geometricProduct(a: MultiVector, b: MultiVector) -> MultiVector { 
  // The geometric product rules are:
  //   1. eoeo = 0, exex = 1 and eyey = 1, ezez = 1
  //   2. eoex + exeo = 0, eoey + eyeo = 0, eoez + ezeo = 0
  //   3. exey + eyex = 0, exez + ezex = 0, eyez + ezey = 0
  // This results in the following product table:
  var r: MultiVector;
  r.s = a.s * b.s - a.exey * b.exey - a.exez * b.exez - a.eyez * b.eyez - a.exeyez * b.exeyez + a.ex * b.ex + a.ey * b.ey + a.ez * b.ez; // scalar
  r.exey = a.s * b.exey + a.exey * b.s - a.exez * b.eyez + a.eyez * b.exez + a.exeyez * b.ez + a.ex * b.ey - a.ey * b.ex + a.ez * b.exeyez; // exey
  r.exez = a.s * b.exez + a.exey * b.eyez + a.exez * b.s - a.eyez * b.exey - a.exeyez * b.ey + a.ex * b.ez - a.ey * b.exeyez - a.ez * b.ex; // exez
  r.eyez = a.s * b.eyez - a.exey * b.exez + a.exez * b.exey + a.eyez * b.s + a.exeyez * b.ex + a.ex * b.exeyez + a.ey * b.ez - a.ez * b.ey; // eyez
  r.eoex = a.s * b.eoex + a.exey * b.eoey + a.exez * b.eoez - a.eyez * b.eoexeyez + a.eoex * b.s - a.eoey * b.exey - a.eoez * b.exez + a.exeyez * b.eoeyez + a.eoexey * b.ey + a.eoexez * b.ez - a.eoeyez * b.exeyez - a.ex * b.eo + a.ey * b.eoexey + a.ez * b.eoexez + a.eo * b.ex - a.eoexeyez * b.eyez; // eoex
  r.eoey = a.s * b.eoey - a.exey * b.eoex + a.exez * b.eoexeyez + a.eyez * b.eoez + a.eoex * b.exey + a.eoey * b.s - a.eoez * b.eyez - a.exeyez * b.eoexez - a.eoexey * b.ex + a.eoexez * b.exeyez + a.eoeyez * b.ey - a.ex * b.eoexey - a.ey * b.eo + a.ez * b.eoeyez + a.eo * b.ey + a.eoexeyez * b.exez; // eoey
  r.eoez = a.s * b.eoez - a.exey * b.eoexeyez - a.exez * b.eoex - a.eyez * b.eoey + a.eoex * b.exez + a.eoey * b.eyez + a.eoez * b.s + a.exeyez * b.eoexey - a.eoexey * b.exeyez - a.eoexez * b.ex - a.eoeyez * b.ey - a.ex * b.eoexez - a.ey * b.eoeyez - a.ez * b.eo + a.eo * b.ez - a.eoexeyez * b.exey; // eoez
  r.exeyez = a.s * b.exeyez + a.exey * b.ez - a.exez * b.ey + a.eyez * b.ex + a.exeyez * b.s + a.ex * b.eyez - a.ey * b.exez + a.ez * b.exey; // exeyez
  r.eoexey = a.s * b.eoexey + a.exey * b.eo - a.exez * b.eoeyez + a.eyez * b.eoexez + a.eoex * b.ey - a.eoey * b.ex + a.eoez * b.exeyez - a.exeyez * b.eoez + a.eoexey * b.s - a.eoexez * b.eyez + a.eoeyez * b.exez - a.ex * b.eoey + a.ey * b.eoex - a.ez * b.eoexeyez + a.eo * b.exey + a.eoexeyez * b.ez; // eoexey
  r.eoexez = a.s * b.eoexez + a.exey * b.eoeyez + a.exez * b.eo - a.eyez * b.eoexey + a.eoex * b.ez - a.eoey * b.exeyez - a.eoez * b.ex + a.exeyez * b.eoey + a.eoexey * b.eyez + a.eoexez * b.s - a.eoeyez * b.exey - a.ex * b.eoez + a.ey * b.eoexeyez + a.ez * b.eoex + a.eo * b.exez - a.eoexeyez * b.ey; // eoexez
  r.eoeyez = a.s * b.eoeyez - a.exey * b.eoexez + a.exez * b.eoexey + a.eyez * b.eo + a.eoex * b.exeyez + a.eoey * b.ez - a.eoez * b.ey - a.exeyez * b.eoex - a.eoexey * b.exez + a.eoexez * b.exey + a.eoeyez * b.s - a.ex * b.eoexeyez - a.ey * b.eoez + a.ez * b.eoey + a.eo * b.eyez + a.eoexeyez * b.ex; // eoeyez
  r.ex = a.s * b.ex + a.exey * b.ey + a.exez * b.ez - a.eyez * b.exeyez - a.exeyez * b.eyez + a.ex * b.s - a.ey * b.exey - a.ez * b.exez; // ex
  r.ey = a.s * b.ey - a.exey * b.ex + a.exez * b.exeyez + a.eyez * b.ez + a.exeyez * b.exez + a.ex * b.exey + a.ey * b.s - a.ez * b.eyez; // ey
  r.ez = a.s * b.ez - a.exey * b.exeyez - a.exez * b.ex - a.eyez * b.ey - a.exeyez * b.exey + a.ex * b.exez + a.ey * b.eyez + a.ez * b.s; // ez
  r.eo = a.s * b.eo - a.exey * b.eoexey - a.exez * b.eoexez - a.eyez * b.eoeyez + a.eoex * b.ex + a.eoey * b.ey + a.eoez * b.ez + a.exeyez * b.eoexeyez - a.eoexey * b.exey - a.eoexez * b.exez - a.eoeyez * b.eyez - a.ex * b.eoex - a.ey * b.eoey - a.ez * b.eoez + a.eo * b.s - a.eoexeyez * b.exeyez; // eo
  r.eoexeyez = a.s * b.eoexeyez + a.exey * b.eoez - a.exez * b.eoey + a.eyez * b.eoex + a.eoex * b.eyez - a.eoey * b.exez + a.eoez * b.exey - a.exeyez * b.eo + a.eoexey * b.ez - a.eoexez * b.ey + a.eoeyez * b.ex - a.ex * b.eoeyez + a.ey * b.eoexez - a.ez * b.eoexey + a.eo * b.exeyez + a.eoexeyez * b.s; // eoexeyez
  return r;
}

// the reverse of a Multivector
fn reverse(a: MultiVector) -> MultiVector {
  // The reverse is the reverse order of the basis elements
  //  the reverse of a scalar is the scalar
  //  the reverse of exey is eyex = -exey
  //  the reverse of exez is ezex = -exez
  //  the reverse of eyez is ezey = -eyez
  //  the reverse of eoex is exeo = -eoex
  //  the reverse of eoey is eyeo = -eoey
  //  the reverse of eoez is ezeo = -eoez
  //  the reverse of exeyez is ezeyex = exezey = -exeyez
  //  the reverse of eoexey is eyexeo = eoeyex = -eoexey
  //  the reverse of eoexez is ezexeo = eoezex = -eoexez
  //  the reverse of eoeyez is ezeyeo = eoezey = -eoeyez
  //  the reverse of ex, ey, ez, eo are ex, ey, ez, eo
  //  the reverse of eoexeyez is ezeyexeo = -eoezeyex = -eoexezey = eoexeyez
  // So, for [s, exey, exez, eyez, eoex, eoey, eoez, exeyez, eoexey, eoexez, eoeyez, ex, ey, ez, eo, eoexeyez],
  // Its reverse is [s, -exey, -exez, eyez, -eoex, -eoey, -eoez, -exeyez, -eoexey, -eoexez, -eoeyez, ex, ey, ez, eo, eoexeyez].
  return MultiVector(a.s, -a.exey, -a.exez, -a.eyez, -a.eoex, -a.eoey, -a.eoez, -a.exeyez, -a.eoexey, -a.eoexez, -a.eoeyez, a.ex, a.ey, a.ez, a.eo, a.eoexeyez);
}

fn applyMotor(p: MultiVector, m: MultiVector) -> MultiVector {
  // To apply a motor to a point, we use the sandwich operation
  // The formula is m * p * reverse of m
  // Here * is the geometric product
  return geometricProduct(m, geometricProduct(p, reverse(m)));
}

fn motorNorm(m: MultiVector) -> f32 {
  // The norm of a motor is square root of the sum of square of the terms:
  // we have
  var sum = 0.;
  sum += m.s * m.s;
  sum += m.exey * m.exey;
  sum += m.exez * m.exez;
  sum += m.eyez * m.eyez;
  sum += m.eoex * m.eoex;
  sum += m.eoey * m.eoey;
  sum += m.eoez * m.eoez;
  sum += m.exeyez * m.exeyez;
  sum += m.eoexey * m.eoexey;
  sum += m.eoexez * m.eoexez;
  sum += m.eoeyez * m.eoeyez;
  sum += m.ex * m.ex;
  sum += m.ey * m.ey;
  sum += m.ez * m.ez;
  sum += m.eo * m.eo;
  sum += m.eoexeyez * m.eoexeyez;
  return sqrt(sum);
}

fn createTranslator(d: vec3f) -> MultiVector {
  // Given dx and dy describing the moveming in the x and y directions,
  // the translator is given by 1 + dx/2 exeo + dy/2 eyeo + dz/2 ezeo
  // In code, we always store the coefficents of
  //    scalar, exey, exez, eyez, eoex, eoey, eoez, exeyez, eoexey, eoexez, eoeyez, ex, ey, ez, eo, eoexeyez
  // Hence the implementation is as below
  return MultiVector(1, 0, 0, 0, -d.x / 2, -d.y / 2, -d.z / 2, 0, 0, 0, 0, 0, 0, 0, 0, 0);
}

fn extractTranslator(m: MultiVector) -> MultiVector {
  // Given a general motor, we can extract the translator part
  return MultiVector(1, 0, 0, 0, m.eoex, m.eoey, m.eoez, 0, 0, 0, 0, 0, 0, 0, 0, 0);
}

fn createDir(d: vec3f) -> MultiVector {
  // A direction is given by dx eyez + dy ezex + dz exey
  //    scalar, exey, exez, eyez, eoex, eoey, eoez, exeyez, eoexey, eoexez, eoeyez, ex, ey, ez, eo, eoexeyez
  return MultiVector(0, d.z, -d.y, d.x, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
}

fn createLine(s: vec3f, d: vec3f) -> MultiVector {
  // A line is given by a starting point (sx, sy, sz) and a direction (dx, dy, dz)
  //  in this form: dx eyez + dy ezex + dz exey + (dy * sz - dz * sy) exeo + (dz * sx - dx * sz) eyeo + (dx * sy - dy * sx) ezeo
  let n = createDir(d); // represent the input direction in PGA
  let dir = normalizeMotor(n); // normalize the direction to make sure it is a unit direction
  // Note dir.exey = dz, dir.exez = -dy, dir.eyez = dx
  return MultiVector(0, dir.exey, dir.exez, dir.eyez, -(-dir.exez * s.z - dir.exey * s.y), -(dir.exey * s.x - dir.eyez * s.z), -(dir.eyez * s.y + dir.exez * s.x), 0, 0, 0, 0, 0, 0, 0, 0, 0);
}

fn createRotor(angle: f32, d: vec3f, spt: vec3f) -> MultiVector {
  // Given an angle and a rotation axis direction (dx, dy, dz) and a start point of the rotation axis,
  // the rotor is given by cos(angle / 2 ) + sin(angle / 2 ) L
  //  where L is the line in 3D PGA formed by the direction and the start point
  let c = cos(angle / 2);
  let s = sin(angle / 2);
  let L = createLine(spt, d);
  return MultiVector(c, s * L.exey, s * L.exez, s * L.eyez, s * L.eoex, s * L.eoey, s * L.eoez, 0, 0, 0, 0, 0, 0, 0, 0, 0);
}

fn extractRotor(m: MultiVector) -> MultiVector {
  // Given a general motor, we can extract the rotor part
  return MultiVector(m.s, m.exey, m.exez, m.eyez, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
}

fn createPoint(p: vec3f) -> MultiVector {
  // Given a point in 3D with coordinates (x, y, z)
  // A point in PGA is given by exeyez + x eoezey + y eoexez + z eoeyex
  // In code, we always store the coefficents of 
  //    scalar, exey, exez, eyez, eoex, eoey, eoez, exeyez, eoexey, eoexez, eoeyez, ex, ey, ez, eo, eoexeyez
  return MultiVector(0, 0, 0, 0, 0, 0, 0, 1, -p.z, p.y, -p.x, 0, 0, 0, 0, 0);
}

fn extractPoint(p: MultiVector) -> vec3f {
  // to extract the 3d point from a exeyez + b eoezey + c eoexez + d eoeyex
  // we have x = -b/a and y = c/a and z = -d/a
  return vec3f(-p.eoeyez / p.exeyez, p.eoexez / p.exeyez, -p.eoexey / p.exeyez);
}

fn createPlane(n: vec3f, d: f32) -> MultiVector {
  // Given a plane in 3D with normal (nx, ny, nz) and distance from the origin d
  // A plane in PGA is given by nx ex + ny ey + nz ez - deo
  // In code, we always store the coefficents of 
  //    scalar, exey, exez, eyez, eoex, eoey, eoez, exeyez, eoexey, eoexez, eoeyez, ex, ey, ez, eo, eoexeyez
  return MultiVector(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, n.x, n.y, n.z, -d, 0);
}

fn createPlaneFromPoints(p1: vec3f, p2: vec3f, p3: vec3f) -> MultiVector {
  // Given three poitns (x1, y1, z1), (x2, y2, z2), (x3, y3, z3)
  // A plane in PGA is given by 
  //        ((y2 * z3 - y3 * z2) -      (y1 * z3 - y3 * z1) +      (y1 * z2 - y2 * z1)) ex 
  // -      ((x2 * z3 - x3 * z2) -      (x1 * z3 - x3 * z1) +      (x1 * z2 - x2 * z1)) ey 
  // +      ((x2 * y3 - x3 * y2) -      (x1 * y3 - x3 * y1) +      (x1 * y2 - x2 * y1)) ez 
  // + (x1 * (y2 * z3 - y3 * z2) - x2 * (y1 * z3 - y3 * z1) + x3 * (y1 * z2 - y2 * z1)) eo
  let nx =          (p2[1] * p3[2] - p3[1] * p2[2]) -         (p1[1] * p3[2] - p3[1] * p1[2]) +         (p1[1] * p2[2] - p2[1] * p1[2]);
  let ny =          (p2[0] * p3[2] - p3[0] * p2[2]) -         (p1[0] * p3[2] - p3[0] * p1[2]) +         (p1[0] * p2[2] - p2[0] * p1[2]);
  let nz =          (p2[0] * p3[1] - p3[0] * p2[1]) -         (p1[0] * p3[1] - p3[0] * p1[1]) +         (p1[0] * p2[1] - p2[0] * p1[1]);
  let d = (p1[0] * (p2[1] * p3[2] - p3[1] * p2[2]) - p2[0] * (p1[1] * p3[2] - p3[1] * p1[2]) + p3[0] * (p1[1] * p2[2] - p2[1] * p1[2]));
  return createPlane(vec3f(nx, -ny, nz), d);
}

// define a constant
const EPSILON : f32 = 0.00000001;

// a structure to store the hit information
struct HitInfo {
  p: vec3f,      // where it hits
  hit: bool,     // if it hits
  inPlane: bool, // if it does not hit, is it in the plane?
}

fn linePlaneIntersection(L: MultiVector, P: MultiVector) -> HitInfo {
  // In PGA, the intersection point is simply embedded in the geometric product betwen them
  let new_p = geometricProduct(L, P);
  var hitInfo: HitInfo;
  hitInfo.p = extractPoint(new_p);
  hitInfo.hit = !(abs(new_p.exeyez) <= EPSILON);
  hitInfo.inPlane = hitInfo.hit && abs(new_p.eoexey) <= EPSILON && abs(new_p.eoexez) <= EPSILON && abs(new_p.eoeyez) <= EPSILON;
  return hitInfo;
}

fn normalizeMotor(m: MultiVector) -> MultiVector {
  // To normalize a motor, we divide each coefficient by its norm
  let mnorm = motorNorm(m);
  if (mnorm == 0.0) {
    return MultiVector(1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  }
  return MultiVector(m.s / mnorm, m.exey / mnorm, m.exez / mnorm, m.eyez / mnorm, m.eoex / mnorm, m.eoey / mnorm, m.eoez / mnorm, m.exeyez / mnorm, m.eoexey / mnorm, m.eoexez / mnorm, m.eoeyez / mnorm, m.ex / mnorm, m.ey / mnorm, m.ez / mnorm, m.eo / mnorm, m.eoexeyez / mnorm);
}

fn applyMotorToPoint(p: vec3f, m: MultiVector) -> vec3f {
  // apply the motor m to transform the point p
  // this code covert the 3d point p into PGA and apply the motor to transform it
  // then extra the result from PGA
  let new_p = applyMotor(createPoint(p), m);
  return extractPoint(new_p);
};

fn applyMotorToDir(d: vec3f, m: MultiVector) -> vec3f {
  // apply the motor m to transform the direction d
  // this code convert the 3d direction d into PGA, then extract the rotor from the motor
  // and transform the direction using the rotor
  // last, extra the result from PGA
  let r = extractRotor(m);
  let new_d = applyMotor(createPoint(d), r);
  return extractPoint(new_d);
}

fn isInside(v0: vec3f, v1: vec3f, v2: vec3f, p: vec3f) -> vec4f {
  let pga0 = createPoint(v0);
  let pga1 = createPoint(v1);
  let pga2 = createPoint(v2);
  let pgap = createPoint(p);
  let plane012 = createPlaneFromPoints(v0, v1, v2);
  let planep12 = createPlaneFromPoints(p, v1, v2);
  let plane0p2 = createPlaneFromPoints(v0, p, v2);
  let plane01p = createPlaneFromPoints(v0, v1, p);
  let area012 = plane012.ex * plane012.ex + plane012.ey * plane012.ey + plane012.ez * plane012.ez + plane012.eo * plane012.eo;
  let areap12 = plane012.ex * planep12.ex + plane012.ey * planep12.ey + plane012.ez * planep12.ez + plane012.eo * planep12.eo;
  let area0p2 = plane012.ex * plane0p2.ex + plane012.ey * plane0p2.ey + plane012.ez * plane0p2.ez + plane012.eo * plane0p2.eo;
  let area01p = plane012.ex * plane01p.ex + plane012.ey * plane01p.ey + plane012.ez * plane01p.ez + plane012.eo * plane01p.eo;
  
  // compute barycentric coordinates
  let lambda1 = areap12 / area012;
  let lambda2 = area0p2 / area012;
  let lambda3 = area01p / area012;
  return vec4f(lambda1, lambda2, lambda3, f32(lambda1 >= 0 && lambda1 <= 1 && lambda2 >= 0 && lambda2 <= 1 && lambda3 >= 0 && lambda3 <= 1));
}

// struct to store 3D PGA pose
struct Camera {
  motor: MultiVector,
  focal: vec2f,
  res: vec2f,
  t: f32,
  dummy: f32
}

// binding the camera pose
@group(0) @binding(0) var<uniform> cameraPose: Camera;

struct VertexOut {
  @builtin(position) pos: vec4f,
  @location(0) normal: vec3f,
}

@vertex // this compute the scene coordiante of each input vertex
fn vertexMain(@location(0) srcpos: vec3f, @location(1) srcnormal: vec3f, @location(2) tgtpos: vec3f, @location(3) tgtnormal: vec3f) -> VertexOut {
  // interpolate the vertices
  var interpolatePt = srcpos * (1 - cameraPose.t) + tgtpos * (cameraPose.t);
  // transform and project 
  var transformedPt = applyMotorToPoint(interpolatePt, reverse(cameraPose.motor));
  var projectedPt = vec2f(transformedPt.x/transformedPt.z, transformedPt.y/transformedPt.z) * cameraPose.focal;
  // compute Proper Depth for WebGPU Clip Space
  var near = 0.1;  // Adjust as needed
  var far = 100.0; // Adjust as needed
  // Map depth to WebGPU NDC range [0, 1] for depth testing
  var depth = (transformedPt.z - near) / (far - near); // Normalize Z depth
  var clipDepth = depth; // WebGPU expects depth in range [0, 1]
  // Fill in the output
  var out: VertexOut;
  out.pos = vec4f(projectedPt, clipDepth, 1);
  // interpolate the normal
  out.normal = srcnormal * (1 - cameraPose.t) + tgtnormal * (cameraPose.t);
  return out;
}

@fragment // this compute the color of each pixel
fn fragmentMain(@location(0) normal: vec3f) -> @location(0) vec4f {
  // TODO: Modify the fragment shader to implement a shader model to color the mesh using the normal
  
  return vec4f((normal + 1) * 0.5, 1); // simple normal color
}
