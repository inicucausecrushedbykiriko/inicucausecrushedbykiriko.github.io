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

import RayTracingObject from "/quest9/lib/DSViz/RayTracingObject.js";
import UnitCube from "/quest9/lib/DS/UnitCube2.js";

export default class RayTracingBoxLightObject extends RayTracingObject {
  constructor(device, canvasFormat, camera, showTexture = true) {
    super(device, canvasFormat);
    this._box = new UnitCube();
    this._camera = camera;
    this._showTexture = showTexture;
  }

  updateShadowMode(mode) {
    super.updateShadowMode(mode); // Calls the inherited updateShadowMode from RayTracingObject
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

  updateLight(light) {
    let shadowFactor = 1;
    if (this._shadowMode === 1) {
      shadowFactor = this.calculatePCFSoftShadows(hitPoint, light);
    } else if (this._shadowMode === 2) {
      shadowFactor = this.calculateDistanceBasedSoftShadows(hitPoint, light);
    } else if (this._shadowMode === 3) {
      shadowFactor = this.calculateSDFSoftShadows(hitPoint, light);
    }
    this._lightIntensity *= shadowFactor;
  }

  calculatePCFSoftShadows(hitPoint, lightSource) {
    let numSamples = 16;
    let totalIntensity = 0;

    for (let i = 0; i < numSamples; i++) {
      let jitteredLightDir = this.jitterLightDirection(lightSource.direction);
      let shadowRay = this.calculateShadowRay(hitPoint, jitteredLightDir);
      if (!this.isInShadow(shadowRay)) {
        let lightInfo = this.getLightInfo(lightSource.position, jitteredLightDir, hitPoint, normal);
        totalIntensity += lightInfo.intensity;
      }
    }

    return totalIntensity / numSamples;
  }

  jitterLightDirection(lightDir) {
    let jitter = new Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    return lightDir.add(jitter).normalize();
  }

  calculateDistanceBasedSoftShadows(hitPoint, lightSource) {
    let shadowRay = new Ray(hitPoint, lightSource.position.sub(hitPoint).normalize());
    let shadowHit = this.traceScene(shadowRay);

    if (shadowHit) {
      let distance = hitPoint.distanceTo(shadowHit.position);
      return Math.max(0.1, 1 - Math.pow(distance / 10, 2));
    }

    return 1.0;
  }

  calculateSDFSoftShadows(hitPoint, lightSource) {
    let shadowRay = new Ray(hitPoint, lightSource.position.sub(hitPoint).normalize());
    let marchStep = 0.01;
    let maxDistance = 10;
    let closestDist = maxDistance;

    for (let t = 0; t < maxDistance; t += marchStep) {
      let marchPoint = hitPoint.add(shadowRay.direction.mul(t));
      let dist = this.getSDF(marchPoint);  

      if (dist < closestDist) {
        closestDist = dist;
      }
    }

    return Math.max(0.1, 1 - closestDist / maxDistance);
  }

  getSDF(point) {
    return Math.abs(point.distanceTo(sphere.center) - sphere.radius);
  }

  isInShadow(shadowRay) {
    let shadowHit = this.traceScene(shadowRay);
    return shadowHit != null;
  }

  calculateShadowRay(hitPoint, lightPosition) {
    return new Ray(hitPoint, lightPosition.sub(hitPoint).normalize());
  }

  traceScene(ray) {
    return null; 
  }

  async createShaders() {
    let shaderCode = await this.loadShader("/quest9/shaders/traceboxlight2.wgsl");
    this._shaderModule = this._device.createShaderModule({
      label: " Shader " + this.getName(),
      code: shaderCode,
    });
    this._bindGroupLayout = this._device.createBindGroupLayout({
      label: "Ray Trace Box Layout " + this.getName(),
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {}
      }, {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {}
      }, {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        storageTexture: { format: this._canvasFormat }
      }, {
        binding: 3,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {}
      }]
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
      entries: [{
        binding: 0,
        resource: { buffer: this._cameraBuffer }
      }, {
        binding: 1,
        resource: { buffer: this._boxBuffer }
      }, {
        binding: 2,
        resource: outTexture.createView()
      }, {
        binding: 3,
        resource: { buffer: this._lightBuffer }
      }],
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
    pass.dispatchWorkgroups(Math.ceil(this._wgWidth / 16), Math.ceil(this._wgHeight / 16));
  }
}
