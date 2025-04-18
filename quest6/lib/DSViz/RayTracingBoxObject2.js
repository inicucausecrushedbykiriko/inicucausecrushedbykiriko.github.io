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
import UnitSphere from "/quest6/lib/DS/UnitSphere.js"
import UnitCylinder from "/quest6/lib/DS/UnitCylinder.js"
import UnitCone from "/quest6/lib/DS/UnitCone.js"
import UnitEllipsoid from "/quest6/lib/DS/UnitEllipsoid.js"

export default class RayTracingBoxObject extends RayTracingObject {
  constructor(device, canvasFormat, camera, showTexture = true) {
    super(device, canvasFormat);
    this._camera = camera;
    this._showTexture = showTexture;
    this._box = new UnitCube();
    this._sphere = new UnitSphere();
    this._cylinder = new UnitCylinder();
    this._cone = new UnitCone();
    this._ellipsoid = new UnitEllipsoid();
  }
  
  async createGeometry() {
    this._cameraBuffer = this._device.createBuffer({
      size: this._camera._pose.byteLength +
            this._camera._focal.byteLength +
            this._camera._resolutions.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this._device.queue.writeBuffer(this._cameraBuffer, 0, this._camera._pose);
    this._device.queue.writeBuffer(
      this._cameraBuffer,
      this._camera._pose.byteLength,
      this._camera._focal
    );
    this._device.queue.writeBuffer(
      this._cameraBuffer,
      this._camera._pose.byteLength + this._camera._focal.byteLength,
      this._camera._resolutions
    );

    let boxBytes = this._box._pose.byteLength +
                   this._box._scales.byteLength +
                   this._box._front.byteLength * 6;
    let sphereBytes = this._sphere._pose.byteLength + this._sphere._scales.byteLength;
    let cylinderBytes = this._cylinder._pose.byteLength + this._cylinder._scales.byteLength;
    let coneBytes = this._cone._pose.byteLength + this._cone._scales.byteLength;
    let ellipsoidBytes = this._ellipsoid._pose.byteLength + this._ellipsoid._scales.byteLength;
    let totalSize = boxBytes + sphereBytes + cylinderBytes + coneBytes + ellipsoidBytes;

    this._sceneBuffer = this._device.createBuffer({
      size: totalSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    let offset = 0;
    this._device.queue.writeBuffer(this._sceneBuffer, offset, this._box._pose);
    offset += this._box._pose.byteLength;
    this._device.queue.writeBuffer(this._sceneBuffer, offset, this._box._scales);
    offset += this._box._scales.byteLength;
    this._device.queue.writeBuffer(this._sceneBuffer, offset, this._box._front);
    offset += this._box._front.byteLength;
    this._device.queue.writeBuffer(this._sceneBuffer, offset, this._box._back);
    offset += this._box._back.byteLength;
    this._device.queue.writeBuffer(this._sceneBuffer, offset, this._box._left);
    offset += this._box._left.byteLength;
    this._device.queue.writeBuffer(this._sceneBuffer, offset, this._box._right);
    offset += this._box._right.byteLength;
    this._device.queue.writeBuffer(this._sceneBuffer, offset, this._box._top);
    offset += this._box._top.byteLength;
    this._device.queue.writeBuffer(this._sceneBuffer, offset, this._box._down);
    offset += this._box._down.byteLength;

    this._device.queue.writeBuffer(this._sceneBuffer, offset, this._sphere._pose);
    offset += this._sphere._pose.byteLength;
    this._device.queue.writeBuffer(this._sceneBuffer, offset, this._sphere._scales);
    offset += this._sphere._scales.byteLength;

    this._device.queue.writeBuffer(this._sceneBuffer, offset, this._cylinder._pose);
    offset += this._cylinder._pose.byteLength;
    this._device.queue.writeBuffer(this._sceneBuffer, offset, this._cylinder._scales);
    offset += this._cylinder._scales.byteLength;

    this._device.queue.writeBuffer(this._sceneBuffer, offset, this._cone._pose);
    offset += this._cone._pose.byteLength;
    this._device.queue.writeBuffer(this._sceneBuffer, offset, this._cone._scales);
    offset += this._cone._scales.byteLength;

    this._device.queue.writeBuffer(this._sceneBuffer, offset, this._ellipsoid._pose);
    offset += this._ellipsoid._pose.byteLength;
    this._device.queue.writeBuffer(this._sceneBuffer, offset, this._ellipsoid._scales);

  }
  
  updateGeometry() {
    this._camera.updateSize(this._imgWidth, this._imgHeight);
    this._device.queue.writeBuffer(
      this._cameraBuffer,
      this._camera._pose.byteLength + this._camera._focal.byteLength,
      this._camera._resolutions
    );
  }
  
  updateBoxPose() {
    this._device.queue.writeBuffer(this._sceneBuffer, 0, this._box._pose);
  }
  updateBoxScales() {
    let offset = this._box._pose.byteLength;
    this._device.queue.writeBuffer(this._sceneBuffer, offset, this._box._scales);
  }
  updateSpherePose() {
    let offset = this._box._pose.byteLength + this._box._scales.byteLength + this._box._front.byteLength*6;
    this._device.queue.writeBuffer(this._sceneBuffer, offset, this._sphere._pose);
  }
  updateSphereScales() {
    let offset = this._box._pose.byteLength + this._box._scales.byteLength + this._box._front.byteLength*6 + this._sphere._pose.byteLength;
    this._device.queue.writeBuffer(this._sceneBuffer, offset, this._sphere._scales);
  }
  updateCylinderPose() {
    let offset = this._box._pose.byteLength + this._box._scales.byteLength + this._box._front.byteLength*6 +
                 this._sphere._pose.byteLength + this._sphere._scales.byteLength;
    this._device.queue.writeBuffer(this._sceneBuffer, offset, this._cylinder._pose);
  }
  updateCylinderScales() {
    let offset = this._box._pose.byteLength + this._box._scales.byteLength + this._box._front.byteLength*6 +
                 this._sphere._pose.byteLength + this._sphere._scales.byteLength +
                 this._cylinder._pose.byteLength;
    this._device.queue.writeBuffer(this._sceneBuffer, offset, this._cylinder._scales);
  }
  updateConePose() {
    let offset = this._box._pose.byteLength + this._box._scales.byteLength + this._box._front.byteLength*6 +
                 this._sphere._pose.byteLength + this._sphere._scales.byteLength +
                 this._cylinder._pose.byteLength + this._cylinder._scales.byteLength;
    this._device.queue.writeBuffer(this._sceneBuffer, offset, this._cone._pose);
  }
  updateConeScales() {
    let offset = this._box._pose.byteLength + this._box._scales.byteLength + this._box._front.byteLength*6 +
                 this._sphere._pose.byteLength + this._sphere._scales.byteLength +
                 this._cylinder._pose.byteLength + this._cylinder._scales.byteLength +
                 this._cone._pose.byteLength;
    this._device.queue.writeBuffer(this._sceneBuffer, offset, this._cone._scales);
  }
  updateEllipsoidPose() {
    let offset = this._box._pose.byteLength + this._box._scales.byteLength + this._box._front.byteLength*6 +
                 this._sphere._pose.byteLength + this._sphere._scales.byteLength +
                 this._cylinder._pose.byteLength + this._cylinder._scales.byteLength +
                 this._cone._pose.byteLength + this._cone._scales.byteLength;
    this._device.queue.writeBuffer(this._sceneBuffer, offset, this._ellipsoid._pose);
  }
  updateEllipsoidScales() {
    let offset = this._box._pose.byteLength + this._box._scales.byteLength + this._box._front.byteLength*6 +
                 this._sphere._pose.byteLength + this._sphere._scales.byteLength +
                 this._cylinder._pose.byteLength + this._cylinder._scales.byteLength +
                 this._cone._pose.byteLength + this._cone._scales.byteLength +
                 this._ellipsoid._pose.byteLength;
    this._device.queue.writeBuffer(this._sceneBuffer, offset, this._ellipsoid._scales);
  }
  
  updateCameraPose() {
    this._device.queue.writeBuffer(this._cameraBuffer, 0, this._camera._pose);
  }
  updateCameraFocal() {
    this._device.queue.writeBuffer(this._cameraBuffer, this._camera._pose.byteLength, this._camera._focal);
  }

  async createShaders() {
    let shaderCode = await this.loadShader("/quest6/shaders/tracebox2.wgsl");
    this._shaderModule = this._device.createShaderModule({ code: shaderCode });
    this._bindGroupLayout = this._device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: {} },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: {} },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, storageTexture: { format: this._canvasFormat } }
      ]
    });
    this._pipelineLayout = this._device.createPipelineLayout({
      bindGroupLayouts: [this._bindGroupLayout],
    });
  }
  
  async createComputePipeline() {
    this._computePipeline = this._device.createComputePipeline({
      layout: this._pipelineLayout,
      compute: {
        module: this._shaderModule,
        entryPoint: "computeOrthogonalMain",
      }
    });
    this._computeProjectivePipeline = this._device.createComputePipeline({
      layout: this._pipelineLayout,
      compute: {
        module: this._shaderModule,
        entryPoint: "computeProjectiveMain",
      }
    });
    // We'll create a fishball pipeline next:
    this._computeFishballPipeline = this._device.createComputePipeline({
      layout: this._pipelineLayout,
      compute: {
        module: this._shaderModule,
        entryPoint: "computeFishballMain", // We'll add this in tracebox2.wgsl
      }
    });
  }

  createBindGroup(outTexture) {
    this._bindGroup = this._device.createBindGroup({
      layout: this._computePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this._cameraBuffer } },
        { binding: 1, resource: { buffer: this._sceneBuffer } },
        { binding: 2, resource: outTexture.createView() }
      ]
    });
    this._wgWidth = Math.ceil(outTexture.width);
    this._wgHeight = Math.ceil(outTexture.height);
  }
  
  compute(pass) {
    // Decide pipeline based on camera._mode
    if (this._camera._mode === "projective") {
      pass.setPipeline(this._computeProjectivePipeline);
    } else if (this._camera._mode === "fishball") {
      pass.setPipeline(this._computeFishballPipeline);
    } else {
      pass.setPipeline(this._computePipeline); // orthographic
    }

    pass.setBindGroup(0, this._bindGroup);
    pass.dispatchWorkgroups(Math.ceil(this._wgWidth/16), Math.ceil(this._wgHeight/16));
  }
}
