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
import PGA3D from '/quest6/lib/Math/PGA3D.js'

export default class Camera {
  constructor(w=0, h=0){
    this._pose = new Float32Array(16)
    for(let i=0; i<16; i++) this._pose[i] = 0
    this._pose[0] = 1
    this._focal = new Float32Array([1,1])
    this._resolutions = new Float32Array([w, h])
    this._isProjective = false
  }
  resetPose(){
    for(let i=0; i<16; i++) this._pose[i] = 0
    this._pose[0] = 1
    this._focal[0] = 1
    this._focal[1] = 1
  }
  updatePose(n){ for(let i=0; i<16; i++) this._pose[i] = n[i] }
  updateSize(w, h){ this._resolutions[0] = w; this._resolutions[1] = h }
  moveX(d){
    let r = PGA3D.extractRotor(this._pose)
    let v = PGA3D.applyMotorToPoint([d,0,0], r)
    let t = PGA3D.createTranslator(v[0], v[1], v[2])
    let p = PGA3D.geometricProduct(t, this._pose)
    this.updatePose(p)
  }
  moveY(d){
    let r = PGA3D.extractRotor(this._pose)
    let v = PGA3D.applyMotorToPoint([0,d,0], r)
    let t = PGA3D.createTranslator(v[0], v[1], v[2])
    let p = PGA3D.geometricProduct(t, this._pose)
    this.updatePose(p)
  }
  moveZ(d){
    let r = PGA3D.extractRotor(this._pose)
    let v = PGA3D.applyMotorToPoint([0,0,d], r)
    let t = PGA3D.createTranslator(v[0], v[1], v[2])
    let p = PGA3D.geometricProduct(t, this._pose)
    this.updatePose(p)
  }
  rotateX(a){
    let axis = PGA3D.applyMotorToDir([1,0,0], this._pose)
    let pos = PGA3D.applyMotorToPoint([0,0,0], this._pose)
    let r = PGA3D.createRotor(a, axis[0], axis[1], axis[2], pos[0], pos[1], pos[2])
    let p = PGA3D.geometricProduct(this._pose, r)
    this.updatePose(p)
  }
  rotateY(a){
    let axis = PGA3D.applyMotorToDir([0,1,0], this._pose)
    let pos = PGA3D.applyMotorToPoint([0,0,0], this._pose)
    let r = PGA3D.createRotor(a, axis[0], axis[1], axis[2], pos[0], pos[1], pos[2])
    let p = PGA3D.geometricProduct(this._pose, r)
    this.updatePose(p)
  }
  rotateZ(a){
    let axis = PGA3D.applyMotorToDir([0,0,1], this._pose)
    let pos = PGA3D.applyMotorToPoint([0,0,0], this._pose)
    let r = PGA3D.createRotor(a, axis[0], axis[1], axis[2], pos[0], pos[1], pos[2])
    let p = PGA3D.geometricProduct(this._pose, r)
    this.updatePose(p)
  }
  changeFocalX(x){
    this._focal[0] += x
    if(this._focal[0] < 0.01) this._focal[0] = 0.01
  }
  changeFocalY(y){
    this._focal[1] += y
    if(this._focal[1] < 0.01) this._focal[1] = 0.01
  }
}
