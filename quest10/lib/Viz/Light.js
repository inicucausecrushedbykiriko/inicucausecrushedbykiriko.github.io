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
 
export default class Light {
  // A general class to model light source
  constructor() {
    // the light intensity - it has three channels rgb and a dummy value for GPU memory alignment
    this._intensity = new Float32Array(Array(4).fill(0));
    // the light position - it has three coorindates xyz and a dummy value for GPU memory alignment 
    this._position = new Float32Array(Array(4).fill(0));
    // the light direction - it has three coorindates xyz and a dummy value for GPU memory alignment 
    this._direction = new Float32Array(Array(4).fill(0));
    // the light attenuation coefficients - it has three coefficients k0, k1, k2 and a dummy value for GPU memory alignment - k0 is the constant coefficient, k1 is the linear coefficient, and k2 is the quadratic coefficients
    this._attenuation = new Float32Array(Array(4).fill(0));
    this._attenuation[0] = 1.; // default is k0 = 1, i.e. no attenuation at all
    // the light model parameters, which is different for different light source
    this._params = new Float32Array(Array(4).fill(0));
  }
}
