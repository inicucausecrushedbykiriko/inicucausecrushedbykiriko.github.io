/*!
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
  
export default class PGA3D {
  static geometricProduct(a, b) { 
    // Note, both points, lines, and motors are using 
    //    0   1     2     3     4     5     6      7       8       9       10    11  12  13  14    15
    //   [s, exey, exez, eyez, eoex, eoey, eoez, exeyez, eoexey, eoexez, eoeyez] ex, ey, ez, eo, eoexeyez
    // The geometric product rules are:
    //   1. eoeo = 0, exex = 1 and eyey = 1, ezez = 1
    //   2. eoex + exeo = 0, eoey + eyeo = 0, eoez + ezeo = 0
    //   3. exey + eyex = 0, exez + ezex = 0, eyez + ezey = 0
    // This results in the following product table:
    return [
      a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3] - a[7] * b[7] + a[11] * b[11] + a[12] * b[12] + a[13] * b[13], // scalar
      a[0] * b[1] + a[1] * b[0] - a[2] * b[3] + a[3] * b[2] + a[7] * b[13] + a[11] * b[12] - a[12] * b[11] + a[13] * b[7], // exey
      a[0] * b[2] + a[1] * b[3] + a[2] * b[0] - a[3] * b[1] - a[7] * b[12] + a[11] * b[13] - a[12] * b[7] - a[13] * b[11], // exez
      a[0] * b[3] - a[1] * b[2] + a[2] * b[1] + a[3] * b[0] + a[7] * b[11] + a[11] * b[7] + a[12] * b[13] - a[13] * b[12], // eyez
      a[0] * b[4] + a[1] * b[5] + a[2] * b[6] - a[3] * b[15] + a[4] * b[0] - a[5] * b[1] - a[6] * b[2] + a[7] * b[10] + a[8] * b[12] + a[9] * b[13] - a[10] * b[7] - a[11] * b[14] + a[12] * b[8] + a[13] * b[9] + a[14] * b[11] - a[15] * b[3], // eoex
      a[0] * b[5] - a[1] * b[4] + a[2] * b[15] + a[3] * b[6] + a[4] * b[1] + a[5] * b[0] - a[6] * b[3] - a[7] * b[9] - a[8] * b[11] + a[9] * b[7] + a[10] * b[12] - a[11] * b[8] - a[12] * b[14] + a[13] * b[10] + a[14] * b[12] + a[15] * b[2], // eoey
      a[0] * b[6] - a[1] * b[15] - a[2] * b[4] - a[3] * b[5] + a[4] * b[2] + a[5] * b[3] + a[6] * b[0] + a[7] * b[8] - a[8] * b[7] - a[9] * b[11] - a[10] * b[12] - a[11] * b[9] - a[12] * b[10] - a[13] * b[14] + a[14] * b[13] - a[15] * b[1], // eoez
      a[0] * b[7] + a[1] * b[13] - a[2] * b[12] + a[3] * b[11] + a[7] * b[0] + a[11] * b[3] - a[12] * b[2] + a[13] * b[1], // exeyez
      a[0] * b[8] + a[1] * b[14] - a[2] * b[10] + a[3] * b[9] + a[4] * b[12] - a[5] * b[11] + a[6] * b[7] - a[7] * b[6] + a[8] * b[0] - a[9] * b[3] + a[10] * b[2] - a[11] * b[5] + a[12] * b[4] - a[13] * b[15] + a[14] * b[1] + a[15] * b[13], // eoexey
      a[0] * b[9] + a[1] * b[10] + a[2] * b[14] - a[3] * b[8] + a[4] * b[13] - a[5] * b[7] - a[6] * b[11] + a[7] * b[5] + a[8] * b[3] + a[9] * b[0] - a[10] * b[1] - a[11] * b[6] + a[12] * b[15] + a[13] * b[4] + a[14] * b[2] - a[15] * b[12], // eoexez
      a[0] * b[10] - a[1] * b[9] + a[2] * b[8] + a[3] * b[14] + a[4] * b[7] + a[5] * b[13] - a[6] * b[12] - a[7] * b[4] - a[8] * b[2] + a[9] * b[1] + a[10] * b[0] - a[11] * b[15] - a[12] * b[6] + a[13] * b[5] + a[14] * b[3] + a[15] * b[11], // eoeyez
      a[0] * b[11] + a[1] * b[12] + a[2] * b[13] - a[3] * b[7] - a[7] * b[3] + a[11] * b[0] - a[12] * b[1] - a[13] * b[2], // ex
      a[0] * b[12] - a[1] * b[11] + a[2] * b[7] + a[3] * b[13] + a[7] * b[2] + a[11] * b[1] + a[12] * b[0] - a[13] * b[3], // ey
      a[0] * b[13] - a[1] * b[7] - a[2] * b[11] - a[3] * b[12] - a[7] * b[1] + a[11] * b[2] + a[12] * b[3] + a[13] * b[0], // ez
      a[0] * b[14] - a[1] * b[8] - a[2] * b[9] - a[3] * b[10] + a[4] * b[11] + a[5] * b[12] + a[6] * b[13] + a[7] * b[15] - a[8] * b[1] - a[9] * b[2] - a[10] * b[3] - a[11] * b[4] - a[12] * b[5] - a[13] * b[6] + a[14] * b[0] - a[15] * b[7], // eo
      a[0] * b[15] + a[1] * b[6] - a[2] * b[5] + a[3] * b[4] + a[4] * b[3] - a[5] * b[2] + a[6] * b[1] - a[7] * b[14] + a[8] * b[13] - a[9] * b[12] + a[10] * b[11] - a[11] * b[10] + a[12] * b[9] - a[13] * b[8] + a[14] * b[7] + a[15] * b[0], // eoexeyez
    ]; 
  }
  
  static reverse(a) {
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
    return [ a[0], -a[1], -a[2], -a[3], -a[4], -a[5], -a[6], -a[7], -a[8], -a[9], -a[10], a[11], a[12], a[13], a[14], a[15]];
  }
  
  static applyMotor(p, m) {
    // To apply a motor to a point, we use the sandwich operation
    // The formula is m * p * reverse of m
    // Here * is the geometric product
    return PGA3D.geometricProduct(m, PGA3D.geometricProduct(p, PGA3D.reverse(m)));
  }
  
  static motorNorm(m) {
    // The norm of a motor is square root of the sum of square of the terms:
    // we have 
    return Math.sqrt(m.map(val => val * val).reduce((s, val) => s + val, 0));
  }
  
  static createTranslator(dx, dy, dz) {
    // Given dx and dy describing the moveming in the x and y directions,
    // the translator is given by 1 + dx/2 exeo + dy/2 eyeo + dz/2 ezeo
    // In code, we always store the coefficents of
    //    scalar, exey, exez, eyez, eoex, eoey, eoez, exeyez, eoexey, eoexez, eoeyez, ex, ey, ez, eo, eoexeyez
    // Hence the implementation is as below
    return [1, 0, 0, 0, -dx / 2, -dy / 2, -dz / 2, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  }
  
  /* verfication of translator
  (exeyez + x eoezey + y eoexez + z eoeyex) (1 - dx/2 exeo - dy/2 eyeo - ez/2 ezeo)
  = exeyez + (- dx/2 - x) eoeyez + (dy/2 + y) eoexez + (-z - dz/2) eoexey
  (1 + dx/2 exeo + dy/2 eyeo + dz/2 ezeo)(exeyez + (- dx/2 - x) eoeyez + (dy/2 + y) eoexez + (-z - dz/2) eoexey)
  = exeyez + (- dx/2 - x) eoeyez + (dy/2 + y) eoexez + (-z - dz/2) eoexey - dx/2 eoeyez + dy/2 eoexez - dz/2 eoexey
  = exeyez + (- x - dx) eoeyez + (y + dy) eoexez + (-z -dz) eoexey
  */
  
  static extractTranslator(m) {
    // Given a general motor, we can extract the translator part
    return [1, 0, 0, 0, m[4], m[5], m[6], 0, 0, 0, 0, 0, 0, 0, 0, 0];
  }
  
  static createRotor(angle, dx = 1, dy = 0, dz = 0, sx = 0, sy = 0, sz = 0) {
    // Given an angle and a rotation axis direction (dx, dy, dz) and a start point of the rotation axis,
    // the rotor is given by cos(angle / 2 ) + sin(angle / 2 ) L
    //  where L is the line in 3D PGA formed by the direction and the start point
    let c = Math.cos(angle / 2);
    let s = Math.sin(angle / 2);
    let L = PGA3D.createLine(sx, sy, sz, dx, dy, dz);
    return [c, s * L[1], s * L[2], s * L[3], s * L[4], s * L[5], s * L[6], 0, 0, 0, 0, 0, 0, 0, 0, 0];
  }
  
  static extractRotor(m) {
    // Given a general motor, we can extract the rotor part
    return [m[0], m[1], m[2], m[3], 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  }
  
  // Assuming using right hand rule - rotate counterclockwise
  /* verfication of rotor - (1, 0, 0) rotated around (1, 0, 0) by 90 degrees. It should not change.
   (exeyez + eoezey) (0.707 - 0.707 eyez) 
   = (0.707 exeyez + 0.707 ex + 0.707 eoezey - 0.707 eo)
   (0.707 + 0.707 eyez) (0.707 exeyez + 0.707 ex + 0.707 eoezey - 0.707 eo)
   = 0.5 exeyez + 0.5 ex + 0.5 eoezey - 0.5 eo - 0.5 ex + 0.5 exeyez + 0.5 eo + 0.5 eoezey
   = exeyez + eoezey => (1, 0, 0)
   
   verfication of rotor - (1, 0, 0) rotated around (0, 1, 0) by 90 degrees. It should be (0, 0, 1)
   (exeyez + eoezey) (0.707 - 0.707 ezex) 
   = 0.707 exeyez + 0.707 ey + 0.707 eoezey - 0.707 eoexey
   (0.707 + 0.707 ezex) (0.707 exeyez + 0.707 ey + 0.707 eoezey - 0.707 eoexey)
   = 0.5 exeyez + 0.5 ey + 0.5 eoezey - 0.5 eoexey - 0.5 ey + 0.5 exeyez - 0.5 eoexey - 0.5 eoezey
   = exeyez - eoexey => (0, 0, 1)
   
   verfication of rotor - (1, 0, 0) rotated around (0, 0, 1) by 90 degrees. It should be (0, -1, 0)
   (exeyez + eoezey) (0.707 - 0.707 exey)
   = 0.707 exeyez + 0.707 ez + 0.707 eoezey - 0.707 eoexez
   (0.707 + 0.707 exey) (0.707 exeyez + 0.707 ez + 0.707 eoezey - 0.707 eoexez)
   = 0.5 exeyez + 0.5 ez + 0.5 eoezey - 0.5 eoexez - 0.5 ez + 0.5 exeyez - 0.5 eoexez - 0.5 eoezey
   = exeyez - eoexez => (0, -1, 0)
   
   verfication of rotor - (0, 1, 0) rotated around (1, 0, 0) by 90 degrees. It should be (0, 0, -1).
   (exeyez + eoexez) (0.707 - 0.707 eyez) 
   = (0.707 exeyez + 0.707 ex + 0.707 eoexez + 0.707 eoexey)
   (0.707 + 0.707 eyez) (0.707 exeyez + 0.707 ex + 0.707 eoexez + 0.707 eoexey)
   = 0.5 exeyez + 0.5 ex + 0.5 eoexez + 0.5 eoexey - 0.5 ex + 0.5 exeyez + 0.5 eoexey - 0.5 eoexez
   = exeyez + eoexey => (0, 0, -1)
   
   verfication of rotor - (0, 1, 0) rotated around (0, 1, 0) by 90 degrees. It should not change.
   (exeyez + eoexez) (0.707 - 0.707 ezex) 
   = 0.707 exeyez + 0.707 ey + 0.707 eoexez - 0.707 eo
   (0.707 + 0.707 ezex) (0.707 exeyez + 0.707 ey + 0.707 eoexez - 0.707 eo)
   = 0.5 exeyez + 0.5 ey + 0.5 eoexez - 0.5 eo - 0.5 ey + 0.5 exeyez + 0.5 eo + 0.5 eoexez
   = exeyez + eoexez => (0, 1, 0)
   
   verfication of rotor - (0, 1, 0) rotated around (0, 0, 1) by 90 degrees. It should be (1, 0, 0)
   (exeyez + eoexez) (0.707 - 0.707 exey)
   = 0.707 exeyez + 0.707 ez + 0.707 eoexez - 0.707 eoeyez
   (0.707 + 0.707 exey) (0.707 exeyez + 0.707 ez + 0.707 eoexez - 0.707 eoeyez)
   = 0.5 exeyez + 0.5 ez + 0.5 eoexez - 0.5 eoeyez - 0.5 ez + 0.5 exeyez - 0.5 eoeyez - 0.5 eoexez
   = exeyez - eoeyez => (1, 0, 0)
   
   verfication of rotor - (0, 0, 1) rotated around (1, 0, 0) by 90 degrees. It should be (0, 1, 0).
   (exeyez + eoeyex) (0.707 - 0.707 eyez) 
   = (0.707 exeyez + 0.707 ex + 0.707 eoeyex + 0.707 eoexez)
   (0.707 + 0.707 eyez) (0.707 exeyez + 0.707 ex + 0.707 eoeyex + 0.707 eoexez)
   = 0.5 exeyez + 0.5 ex + 0.5 eoeyex + 0.5 eoexez - 0.5 ex + 0.5 exeyez + 0.5 eoexez - 0.5 eoeyex
   = exeyez + eoexez => (0, 1, 0)
   
   verfication of rotor - (0, 0, 1) rotated around (0, 1, 0) by 90 degrees. It should be (1, 0, 0)
   (exeyez + eoeyex) (0.707 - 0.707 ezex) 
   = 0.707 exeyez + 0.707 ey + 0.707 eoeyex + 0.707 eoeyez
   (0.707 + 0.707 ezex) (0.707 exeyez + 0.707 ey + 0.707 eoeyex + 0.707 eoeyez)
   = 0.5 exeyez + 0.5 ey + 0.5 eoeyex + 0.5 eoeyez - 0.5 ey + 0.5 exeyez + 0.5 eoeyez - 0.5 eoeyex
   = exeyez + eoeyez => (-1, 0, 0)
   
   verfication of rotor - (0, 0, 1) rotated around (0, 0, 1) by 90 degrees. It should not change.
   (exeyez + eoeyex) (0.707 - 0.707 exey)
   = 0.707 exeyez + 0.707 ez + 0.707 eoeyex - 0.707 eo
   (0.707 + 0.707 exey) (0.707 exeyez + 0.707 ez + 0.707 eoeyex - 0.707 eo)
   = 0.5 exeyez + 0.5 ez + 0.5 eoeyex - 0.5 eo - 0.5 ez + 0.5 exeyez + 0.5 eo + 0.5 eoeyex
   = exeyez + eoeyex => (0, 0, 1)
  */
  
  static createDir(dx, dy, dz) {
    // A direction is given by dx eyez + dy ezex + dz exey
    //    scalar, exey, exez, eyez, eoex, eoey, eoez, exeyez, eoexey, eoexez, eoeyez, ex, ey, ez, eo, eoexeyez
    return [0, dz, -dy, dx, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  }
  
  static createLine(sx, sy, sz, dx, dy, dz) {
    // A line is given by a starting point (sx, sy, sz) and a direction (dx, dy, dz)
    //  in this form: dx eyez + dy ezex + dz exey + (dy * sz - dz * sy) exeo + (dz * sx - dx * sz) eyeo + (dx * sy - dy * sx) ezeo
    let n = PGA3D.createDir(dx, dy, dz); // represent the input direction in PGA
    let dir = PGA3D.normalizeMotor(n); // normalize the direction to make sure it is a unit direction
    // Note dir[1] = dz, dir[2] = -dy, dir[3] = dx
    return [0, dir[1], dir[2], dir[3], -(-dir[2] * sz - dir[1] * sy), -(dir[1] * sx - dir[3] * sz), -(dir[3] * sy + dir[2] * sx), 0, 0, 0, 0, 0, 0, 0, 0, 0];
  }
  
  static createPoint(x, y, z) {
    // Given a point in 3D with coordinates (x, y, z)
    // A point in PGA is given by exeyez + x eoezey + y eoexez + z eoeyex
    // In code, we always store the coefficents of 
    //    scalar, exey, exez, eyez, eoex, eoey, eoez, exeyez, eoexey, eoexez, eoeyez, ex, ey, ez, eo, eoexeyez
    return [0, 0, 0, 0, 0, 0, 0, 1, -z, y, -x, 0, 0, 0, 0, 0];
  }
  
  static extractPoint(p) {
    // to extract the 3d point from a exeyez + b eoezey + c eoexez + d eoeyex
    // we have x = -b/a and y = c/a and z = -d/a
    return [-p[10] / p[7], p[9] / p[7], -p[8] / p[7]];
  }
  
  static createPlane(nx, ny, nz, d) {
    // Given a plane in 3D with normal (nx, ny, nz) and distance from the origin d
    // A plane in PGA is given by nx ex + ny ey + nz ez - deo
    // In code, we always store the coefficents of 
    //    scalar, exey, exez, eyez, eoex, eoey, eoez, exeyez, eoexey, eoexez, eoeyez, ex, ey, ez, eo, eoexeyez
    return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, nx, ny, nz, -d, 0];
  }
  
  static createPlaneFromPoints(p1, p2, p3) {
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
    //let norm = Math.sqrt(nx * nx + ny * ny + nz * nz);
    //console.log(nx / norm, ny / norm, nz / norm, d, d / norm);
    return PGA3D.createPlane(nx, -ny, nz, d);
  }
  
  static linePlaneIntersection(L, P) {
    // In PGA, the intersection point is simply embedded in the geometric product betwen them
    let new_p = PGA3D.geometricProduct(L, P);
    // Note, if exeyez is zero, it means the line does not hit the plane - in parallel
    let isParallel = (Math.abs(new_p[7]) <= 0.00000001);
    // if exeyez is zero and all eoexey, eoexez, eoeyez are zeros, it means it is in the plane
    let inPlane = isParallel && (Math.abs(new_p[8]) <= 0.00000001) && (Math.abs(new_p[9]) <= 0.00000001) && (Math.abs(new_p[10]) <= 0.00000001);
    return [PGA3D.extractPoint(new_p), !isParallel, inPlane];
  }
  
  static normalizeMotor(m) {
    // To normalize a motor, we divide each coefficient by its norm
    let mnorm = PGA3D.motorNorm(m);
    if (mnorm == 0.0) {
      return [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }
    return m.map(val => val / mnorm);
  }
  
  static applyMotorToPoint(p, m) {
    // apply the motor m to transform the point p
    // this code convert the 3d point p into PGA and apply the motor to transform it
    // then extra the result from PGA
    let new_p = PGA3D.applyMotor(PGA3D.createPoint(p[0], p[1], p[2]), m);
    return PGA3D.extractPoint(new_p);
  };

  static applyMotorToDir(d, m) {
    // apply the motor m to transform the direction d
    // this code convert the 3d direction d into PGA, then extract the rotor from the motor
    // and transform the direction using the rotor
    // last, extra the result from PGA
    let r = PGA3D.extractRotor(m);
    let new_d = PGA3D.applyMotor(PGA3D.createPoint(d[0], d[1], d[2]), r);
    return PGA3D.extractPoint(new_d);
  }

  static isInside(v0, v1, v2, p) {
    let pga0 = PGA3D.createPoint(v0[0], v0[1], v0[2]);
    let pga1 = PGA3D.createPoint(v1[0], v1[1], v1[2]);
    let pga2 = PGA3D.createPoint(v2[0], v2[1], v2[2]);
    let pgap = PGA3D.createPoint(p[0], p[1], p[2]);
    let plane012 = PGA3D.createPlaneFromPoints(v0, v1, v2);
    let planep12 = PGA3D.createPlaneFromPoints(p, v1, v2);
    let plane0p2 = PGA3D.createPlaneFromPoints(v0, p, v2);
    let plane01p = PGA3D.createPlaneFromPoints(v0, v1, p);
    let area012 = plane012[11] * plane012[11] + plane012[12] * plane012[12] + plane012[13] * plane012[13] + plane012[14] * plane012[14];
    let areap12 = plane012[11] * planep12[11] + plane012[12] * planep12[12] + plane012[13] * planep12[13] + plane012[14] * planep12[14];
    let area0p2 = plane012[11] * plane0p2[11] + plane012[12] * plane0p2[12] + plane012[13] * plane0p2[13] + plane012[14] * plane0p2[14];
    let area01p = plane012[11] * plane01p[11] + plane012[12] * plane01p[12] + plane012[13] * plane01p[13] + plane012[14] * plane01p[14];
    
    // compute barycentric coordinates
    let lambda1 = areap12 / area012;
    let lambda2 = area0p2 / area012;
    let lambda3 = area01p / area012;
    /*
    console.log(p);
    for (let i = 0; i < 3; ++i) {
      console.log(v0[i] * lambda1 + v1[i] * lambda2 + v2[i] * lambda3); // check if getting back the same point
    }
    */
    
    return lambda1 >= 0 && lambda1 <= 1 && lambda2 >= 0 && lambda2 <= 1 && lambda3 >= 0 && lambda3 <= 1;
  }

}
