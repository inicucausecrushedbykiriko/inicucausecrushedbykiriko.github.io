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

import RayTracingObject from "/quest7/lib/DSViz/RayTracingObject.js";
import VolumeData, { ProceduralVolumeData } from "/quest7/lib/DS/VolumeData.js";

export default class VolumeRenderingSimpleObject extends RayTracingObject {
  constructor(device, canvasFormat, camera, volumeMode = 0) {
    super(device, canvasFormat);
    this._camera = camera;

    if (volumeMode === 0) {
      this._volume = new VolumeData('/quest7/assets/brainweb-pd-1mm-pn0-rf0.raws');
    } else if (volumeMode === 1) {
      this._volume = new VolumeData('/quest7/assets/brainweb-t1-1mm-pn0-rf0.raws');
    } else if (volumeMode === 2) {
      this._volume = new VolumeData('/quest7/assets/brainweb-t2-1mm-pn0-rf0.raws');
    } else {
      this._volume = new ProceduralVolumeData();
    }
  }

  async createGeometry() {
    if (this._volume.init) {
      await this._volume.init();
    }

    const poseSize = this._camera._pose.byteLength;
    const focalSize = this._camera._focal.byteLength;
    const resSize = this._camera._resolutions.byteLength;
    
    this._cameraBuffer = this._device.createBuffer({
      label: "Camera " + this.getName(),
      size: poseSize + focalSize + resSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this._device.queue.writeBuffer(this._cameraBuffer, 0, this._camera._pose);
    this._device.queue.writeBuffer(this._cameraBuffer, poseSize, this._camera._focal);
    this._device.queue.writeBuffer(this._cameraBuffer, poseSize + focalSize, this._camera._resolutions);
    
    this._volumeBuffer = this._device.createBuffer({
      label: "Volume " + this.getName(),
      size: (this._volume.dims.length + this._volume.sizes.length + 2) * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this._device.queue.writeBuffer(
      this._volumeBuffer,
      0,
      new Float32Array([...this._volume.dims, 0, ...this._volume.sizes, 0])
    );
    
    this._dataBuffer = this._device.createBuffer({
      label: "Data " + this.getName(),
      size: this._volume.data.length * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this._device.queue.writeBuffer(this._dataBuffer, 0, new Float32Array(this._volume.data));
  }

  updateGeometry() {
    this._camera.updateSize(this._imgWidth, this._imgHeight);
    const ofs = this._camera._pose.byteLength + this._camera._focal.byteLength;
    this._device.queue.writeBuffer(this._cameraBuffer, ofs, this._camera._resolutions);
  }

  updateCameraPose() {
    this._device.queue.writeBuffer(this._cameraBuffer, 0, this._camera._pose);
  }

  updateCameraFocal() {
    const ofs = this._camera._pose.byteLength;
    this._device.queue.writeBuffer(this._cameraBuffer, ofs, this._camera._focal);
  }

  async createShaders() {
    let shaderCode = await this.loadShader("/quest7/shaders/tracevolumesimple2.wgsl");
    this._shaderModule = this._device.createShaderModule({
      label: " Shader " + this.getName(),
      code: shaderCode,
    });
    
    this._bindGroupLayout = this._device.createBindGroupLayout({
      label: "Ray Trace Volume Layout " + this.getName(),
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: {} },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: {} },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, storageTexture: { format: this._canvasFormat } }
      ]
    });

    this._pipelineLayout = this._device.createPipelineLayout({
      label: "Ray Trace Volume Pipeline Layout",
      bindGroupLayouts: [this._bindGroupLayout],
    });
  }

  async createComputePipeline() {
    this._computePipeline = this._device.createComputePipeline({
      label: "Ray Trace Volume Orthogonal Pipeline " + this.getName(),
      layout: this._pipelineLayout,
      compute: {
        module: this._shaderModule,
        entryPoint: "computeOrthogonalMain",
      }
    });

    this._computeProjectivePipeline = this._device.createComputePipeline({
      label: "Ray Trace Volume Projective Pipeline " + this.getName(),
      layout: this._pipelineLayout,
      compute: {
        module: this._shaderModule,
        entryPoint: "computeProjectiveMain",
      }
    });
  }

  createBindGroup(outTexture) {
    this._bindGroup = this._device.createBindGroup({
      label: "Ray Trace Volume Bind Group",
      layout: this._computePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this._cameraBuffer } },
        { binding: 1, resource: { buffer: this._volumeBuffer } },
        { binding: 2, resource: { buffer: this._dataBuffer } },
        { binding: 3, resource: outTexture.createView() }
      ]
    });
    this._wgWidth = Math.ceil(outTexture.width);
    this._wgHeight = Math.ceil(outTexture.height);
  }

  compute(pass) {
    if (this._camera?._isProjective) {
      pass.setPipeline(this._computeProjectivePipeline);
    } else {
      pass.setPipeline(this._computePipeline);
    }
    pass.setBindGroup(0, this._bindGroup);
    pass.dispatchWorkgroups(
      Math.ceil(this._wgWidth / 16),
      Math.ceil(this._wgHeight / 16)
    );
  }
}
