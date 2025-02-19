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
 
export default class PGA2D {
  static geometricProduct(a, b) { 
    // Note, both points and motors are using S, e01, eo0, eo1
    // We don't need a full geometric product (all other coefficients are zeros)
    // ref: https://geometricalgebratutorial.com/pga/
    // eoo = 0, e00 = 1 e11 = 1
    // s + e01 + eo0 + eo1
    // ss   = s   , se01   = e01  , seo0            = eo0  , seo1          = eo1
    // e01s = e01 , e01e01 = -s   , e01eo0 = e10e0o = -eo1 , e01eo1 = -e0o = eo0
    // eo0s = eo0 , eo0e01 = eo1  , eo0eo0          = 0    , eo0eo1        = 0
    // e01s = e01 , eo1e01 = -eo0 , eo1eo0          = 0    , eo1eo1        = 0
    return [
      a[0] * b[0] - a[1] * b[1] , // scalar
      a[0] * b[1] + a[1] * b[0] , // e01
      a[0] * b[2] + a[1] * b[3] + a[2] * b[0] - a[3] * b[1], // eo0
      a[0] * b[3] - a[1] * b[2] + a[2] * b[1] + a[3] * b[0]  // eo1
    ];
  }
  
  static reverse(a) {
    return [ a[0], -a[1], -a[2], -a[3] ];
  }
  
  static applyMotor(p, m) {
    return PGA2D.geometricProduct(m, PGA2D.geometricProduct(p, PGA2D.reverse(m)));
  }
  
  static motorNorm(m) {
    return Math.sqrt(m[0] * m[0] + m[1] * m[1] + m[2] * m[2] + m[3] * m[3]);
  }
  
  static createTranslator(dx, dy) {
    return [1, 0, dy / 2, -dx / 2]
  }
  
  static createRotor(angle, cx = 0, cy = 0) {
    return [Math.cos(angle / 2), -Math.sin(angle / 2), -cx * Math.sin(angle / 2), -cy * Math.sin(angle / 2)];
  }
  
  static normaliozeMotor(m) {
    let mnorm = PGA2D.motorNorm(m);
    if (mnorm == 0.0) {
      return [1, 0, 0, 0];
    }
    return [m[0] / mnorm, m[1] / mnorm, m[2] / mnorm, m[3] / mnorm];
  }
  
  static applyMotorToPoint(p, m) {
    // ref: https://geometricalgebratutorial.com/pga/
    // Three basic vectors e0, e1 and eo (origin)
    // Three basic bi-vectors e01, eo0, eo1
    // p = 0 1 + 1 e01 + x eo0 + y eo1 
    // m = c 1 + s e01 + dy / 2 eo0 - dx / 2 e_o1 
    let new_p = PGA2D.applyMotor([0, 1, p[0], p[1]], m);
    // to extract the 2d pont from p, x = eo0/e01, y = eo1/e0
    return [new_p[2] / new_p[1], new_p[3] / new_p[1]];
  };

}