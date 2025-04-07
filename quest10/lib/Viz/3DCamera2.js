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
 
import Math3D from '/lib/Math/Math3D.js'
 
export default class Camera {
  constructor(width, height) {
    // pose has eight values
    // First three store the current camera location [pos x, pos y, pos z] + 1 padding
    // Second three store the current camera orientations [angle x, angle y, angle z] + 1 padding
    // the orientation is described by the rotation along the x-, y-, and z-axis.
    this._pose = new Float32Array(Array(8).fill(0));
    this._focal = new Float32Array(Array(2).fill(1));
    this._resolutions = new Float32Array([width, height]);
  }
  
  resetPose() {
    for (let i = 0; i < 8; ++i) this._pose[i] = 0;
    this._focal[0] = 1;
    this._focal[1] = 1;
  }
  
  updatePose(newpose) {
    for (let i = 0; i < 8; ++i) this._pose[i] = newpose[i];
  }
  
  updateSize(width, height) {
    this._resolutions[0] = width;
    this._resolutions[1] = height;
  }

  moveX(d) {
    // TODO: write code to move the camera in the x-direction
    
  }
  
  moveY(d) {
    // TODO: write code to move the camera in the y-direction
    
  }
  
  moveZ(d) {
    // TODO: write code to move the camera in the z-direction
    
  }
  
  rotateX(d) {
    // TODO: write code to rotate the camera along its x-axis
    
    
  }
  
  rotateY(d) {
    // TODO: write code to rotate the camera along its y-axis
    
  }
  
  rotateZ(d) {
    // TODO: write code to rotate the camera along its z-axis
    
    
  }
}
