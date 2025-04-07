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
 
import Light from "/lib/Viz/Light.js"
 
export default class SpotLight extends Light {
  constructor(intensity = [1, 1, 1], position = [0, 0, 0], direction = [0, 1, 0], attenuation = [1, 0.1, 0.01], cutoff = 0.785, dropoff = 5) {
    super();
    for (let i = 0; i < 3; ++i) {
      this._intensity[i] = intensity[i];
      this._position[i] = position[i];
      this._direction[i] = direction[i];
      this._attenuation[i] = attenuation[i];
    }
    // spot light has two parameters - cut off and drop off
    // cut off control how wide the spot light can reach
    // drop off determine how fast the light attennuation goes away from the center
    this._params[0] = cutoff;
    this._params[1] = dropoff;
  }
}
