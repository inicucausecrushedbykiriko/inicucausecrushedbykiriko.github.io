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
import RayTracingObject from "/quest6/lib/DSViz/RayTracingObject.js"
import UnitCube from "/quest6/lib/DS/UnitCube2.js"
import PGA3D from '/quest6/lib/Math/PGA3D.js'

export default class RayTracingBoxObject extends RayTracingObject {
  constructor(device, canvasFormat, camera, showTexture = true) {
    super(device, canvasFormat);
    this._box = new UnitCube();
    this._camera = camera;
    this._showTexture = showTexture;
  }
  
  async createGeometry() {
    this._cameraBuffer = this._device.createBuffer({
      label: "Camera " + this.getName(),
      size: this._camera._pose.byteLength + this._camera._focal.byteLength + this._camera._resolutions.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this._device.queue.writeBuffer(this._cameraBuffer, 0, this._camera._pose);
    this._device.queue.writeBuffer(this._cameraBuffer, this._camera._pose.byteLength, this._camera._focal);
    this._device.queue.writeBuffer(this._cameraBuffer, this._camera._pose.byteLength + this._camera._focal.byteLength, this._camera._resolutions);
    
    this._boxBuffer = this._device.createBuffer({
      label: "Box " + this.getName(),
      size: this._box._pose.byteLength + this._box._scales.byteLength + this._box._top.byteLength * 6,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    let offset = 0;
    this._device.queue.writeBuffer(this._boxBuffer, offset, this._box._pose);
    offset += this._box._pose.byteLength;
    this._device.queue.writeBuffer(this._boxBuffer, offset, this._box._scales);
    offset += this._box._scales.byteLength;
    this._device.queue.writeBuffer(this._boxBuffer, offset, this._box._front);
    offset += this._box._front.byteLength;
    this._device.queue.writeBuffer(this._boxBuffer, offset, this._box._back);
    offset += this._box._back.byteLength;
    this._device.queue.writeBuffer(this._boxBuffer, offset, this._box._left);
    offset += this._box._left.byteLength;
    this._device.queue.writeBuffer(this._boxBuffer, offset, this._box._right);
    offset += this._box._right.byteLength;
    this._device.queue.writeBuffer(this._boxBuffer, offset, this._box._top);
    offset += this._box._top.byteLength;
    this._device.queue.writeBuffer(this._boxBuffer, offset, this._box._down);
  }
  
  updateGeometry() {
    this._camera.updateSize(this._imgWidth, this._imgHeight);
    this._device.queue.writeBuffer(this._cameraBuffer, this._camera._pose.byteLength + this._camera._focal.byteLength, this._camera._resolutions);
  }
  
  updateBoxPose() {
    this._device.queue.writeBuffer(this._boxBuffer, 0, this._box._pose);
  }
  
  updateBoxScales() {
    this._device.queue.writeBuffer(this._boxBuffer, this._box._pose.byteLength, this._box._scales);
  }
  
  updateCameraPose() {
    this._device.queue.writeBuffer(this._cameraBuffer, 0, this._camera._pose);
  }
  
  updateCameraFocal() {
    this._device.queue.writeBuffer(this._cameraBuffer, this._camera._pose.byteLength, this._camera._focal);
  }
  
  async createShaders() {
    let shaderCode = await this.loadShader("/quest6/shaders/tracebox2.wgsl");
    this._shaderModule = this._device.createShaderModule({
      label: "TraceBox2 shader module",
      code: shaderCode,
    });
    this._bindGroupLayout = this._device.createBindGroupLayout({
      label: "Ray Trace Box Layout " + this.getName(),
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: {} },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: {} },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, storageTexture: { format: this._canvasFormat } }
      ]
    });
    this._pipelineLayout = this._device.createPipelineLayout({
      label: "Ray Trace Box Pipeline Layout",
      bindGroupLayouts: [this._bindGroupLayout],
    });
  }
  
  async createComputePipeline() {
    this._computePipeline = this._device.createComputePipeline({
      label: "Ray Trace Box Orthogonal Pipeline " + this.getName(),
      layout: this._pipelineLayout,
      compute: {
        module: this._shaderModule,
        entryPoint: "computeOrthogonalMain",
      }
    });
    this._computeProjectivePipeline = this._device.createComputePipeline({
      label: "Ray Trace Box Projective Pipeline " + this.getName(),
      layout: this._pipelineLayout,
      compute: {
        module: this._shaderModule,
        entryPoint: "computeProjectiveMain",
      }
    });
  }
  
  createBindGroup(outTexture) {
    this._bindGroup = this._device.createBindGroup({
      label: "Ray Trace Box Bind Group",
      layout: this._computePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this._cameraBuffer } },
        { binding: 1, resource: { buffer: this._boxBuffer } },
        { binding: 2, resource: outTexture.createView() }
      ]
    });
    this._wgWidth = Math.ceil(outTexture.width);
    this._wgHeight = Math.ceil(outTexture.height);
  }
  
  compute(pass) {
    if (this._camera._isProjective) {
      pass.setPipeline(this._computeProjectivePipeline);
    } else {
      pass.setPipeline(this._computePipeline);
    }
    pass.setBindGroup(0, this._bindGroup);
    pass.dispatchWorkgroups(Math.ceil(this._wgWidth / 16), Math.ceil(this._wgHeight / 16));
  }
  
  // The following methods update the box's pose using PGA3D operations.
  moveX(d) {
    let r = PGA3D.extractRotor(this._box._pose);
    let v = PGA3D.applyMotorToPoint([d, 0, 0], r);
    let t = PGA3D.createTranslator(v[0], v[1], v[2]);
    let p = PGA3D.geometricProduct(t, this._box._pose);
    for (let i = 0; i < 8; i++) { this._box._pose[i] = p[i]; }
  }
  moveY(d) {
    let r = PGA3D.extractRotor(this._box._pose);
    let v = PGA3D.applyMotorToPoint([0, d, 0], r);
    let t = PGA3D.createTranslator(v[0], v[1], v[2]);
    let p = PGA3D.geometricProduct(t, this._box._pose);
    for (let i = 0; i < 8; i++) { this._box._pose[i] = p[i]; }
  }
  moveZ(d) {
    let r = PGA3D.extractRotor(this._box._pose);
    let v = PGA3D.applyMotorToPoint([0, 0, d], r);
    let t = PGA3D.createTranslator(v[0], v[1], v[2]);
    let p = PGA3D.geometricProduct(t, this._box._pose);
    for (let i = 0; i < 8; i++) { this._box._pose[i] = p[i]; }
  }
  rotateX(a) {
    let axis = PGA3D.applyMotorToDir([1, 0, 0], this._box._pose);
    let pos = PGA3D.applyMotorToPoint([0, 0, 0], this._box._pose);
    let r = PGA3D.createRotor(a, axis[0], axis[1], axis[2], pos[0], pos[1], pos[2]);
    let p = PGA3D.geometricProduct(this._box._pose, r);
    for (let i = 0; i < 8; i++) { this._box._pose[i] = p[i]; }
  }
  rotateY(a) {
    let axis = PGA3D.applyMotorToDir([0, 1, 0], this._box._pose);
    let pos = PGA3D.applyMotorToPoint([0, 0, 0], this._box._pose);
    let r = PGA3D.createRotor(a, axis[0], axis[1], axis[2], pos[0], pos[1], pos[2]);
    let p = PGA3D.geometricProduct(this._box._pose, r);
    for (let i = 0; i < 8; i++) { this._box._pose[i] = p[i]; }
  }
  rotateZ(a) {
    let axis = PGA3D.applyMotorToDir([0, 0, 1], this._box._pose);
    let pos = PGA3D.applyMotorToPoint([0, 0, 0], this._box._pose);
    let r = PGA3D.createRotor(a, axis[0], axis[1], axis[2], pos[0], pos[1], pos[2]);
    let p = PGA3D.geometricProduct(this._box._pose, r);
    for (let i = 0; i < 8; i++) { this._box._pose[i] = p[i]; }
  }
}