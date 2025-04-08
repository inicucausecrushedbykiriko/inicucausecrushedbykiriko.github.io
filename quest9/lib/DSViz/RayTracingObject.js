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

import SceneObject from "/quest9/lib/DSViz/SceneObject.js";

export default class RayTracingObject extends SceneObject {
  constructor(device, canvasFormat) {
    super(device, canvasFormat);
    this._shadowMode = 0; // Default to Hard Shadows
  }

  // Define the updateShadowMode method in RayTracingObject
  updateShadowMode(mode) {
    this._shadowMode = mode;
  }

  async createGeometry() {}

  async createShaders() {
    let shaderCode = await this.loadShader("/quest9/shaders/tracenothing.wgsl");
    this._shaderModule = this._device.createShaderModule({
      label: " Shader " + this.getName(),
      code: shaderCode,
    });
  }

  updateGeometry() {}

  async createRenderPipeline() {}

  render(pass) {}

  async createComputePipeline() {
    this._computePipeline = this._device.createComputePipeline({
      label: "Ray Tracing Pipeline " + this.getName(),
      layout: "auto",
      compute: {
        module: this._shaderModule,
        entryPoint: "computeMain",
      }
    });
  }

  createBindGroup(outTexture) {
    this._bindGroup = this._device.createBindGroup({
      label: "Ray Tracing Bind Group",
      layout: this._computePipeline.getBindGroupLayout(0),
      entries: [{
        binding: 0,
        resource: outTexture.createView()
      }],
    });
    this._wgWidth = Math.ceil(outTexture.width);
    this._wgHeight = Math.ceil(outTexture.height);
  }


  // Soft Shadows using Percentage-Closer Filtering (PCF)
  calculatePCFSoftShadows(hitPoint, lightSource) {
    let numSamples = 16;  // Number of jittered rays for PCF
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

  // Soft Shadows using Distance-based technique
  calculateDistanceBasedSoftShadows(hitPoint, lightSource) {
    let shadowRay = new Ray(hitPoint, lightSource.position.sub(hitPoint).normalize());
    let shadowHit = this.traceScene(shadowRay);

    if (shadowHit) {
      let distance = hitPoint.distanceTo(shadowHit.position);
      return Math.max(0.1, 1 - Math.pow(distance / 10, 2));  // Darker shadows for closer objects
    }

    return 1.0;  // No occlusion, full intensity
  }

  // Signed Distance Field (SDF) Soft Shadows
  calculateSDFSoftShadows(hitPoint, lightSource) {
    let shadowRay = new Ray(hitPoint, lightSource.position.sub(hitPoint).normalize());
    let marchStep = 0.01;
    let maxDistance = 10; // Max distance to march before giving up
    let closestDist = maxDistance;

    for (let t = 0; t < maxDistance; t += marchStep) {
      let marchPoint = hitPoint.add(shadowRay.direction.mul(t));
      let dist = this.getSDF(marchPoint);  // SDF function calculates distance to the closest object

      if (dist < closestDist) {
        closestDist = dist;
      }
    }

    return Math.max(0.1, 1 - closestDist / maxDistance);  // Modulate intensity based on distance
  }

  getSDF(point) {
    // Implement the signed distance function for your scene objects
    // For example, for a sphere: SDF = distance(point, sphereCenter) - sphereRadius
    return Math.abs(point.distanceTo(sphere.center) - sphere.radius);
  }

  isInShadow(shadowRay) {
    let shadowHit = this.traceScene(shadowRay);  // Perform ray tracing to check if the ray hits another object
    return shadowHit != null;
  }

  calculateShadowRay(hitPoint, lightPosition) {
    return new Ray(hitPoint, lightPosition.sub(hitPoint).normalize());
  }

  traceScene(ray) {
    // This function will trace the ray through the scene and return the hit object or null
    // Implement the ray tracing logic here.
    return null;
  }

  compute(pass) {
    for (const object of this._sceneObjects) {
      let shadowRay = this.calculateShadowRay(hitPoint, lightPosition);
      if (this.isInShadow(shadowRay)) {
        return;
      }
    }

    pass.setPipeline(this._computePipeline);
    pass.setBindGroup(0, this._bindGroup);
    pass.dispatchWorkgroups(Math.ceil(this._wgWidth / 16), Math.ceil(this._wgHeight / 16));
  }
}
