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

import SceneObject from "/quest9/lib/DSViz/SceneObject.js"

export default class RayTracingObject extends SceneObject {
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
    // Create a compute pipeline that updates the image.
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
    // Create a bind group
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

  // Add a method to handle area light sampling for soft shadows
  calculateSoftShadows(hitPoint, lightSource) {
    let numSamples = 16; // Number of samples for soft shadow
    let shadowIntensity = 0;
    for (let i = 0; i < numSamples; i++) {
        // Sample random positions around the light source
        let offset = this.getRandomOffsetForLight();
        let lightPosition = lightSource.position.add(offset);
        let shadowRay = this.calculateShadowRay(hitPoint, lightPosition);
        if (!this.isInShadow(shadowRay)) {
            shadowIntensity += 1;
        }
    }
    return shadowIntensity / numSamples; // Average over all samples
  }

  
  compute(pass) {
        // Loop through all objects in the scene
    for (const object of this._sceneObjects) {
        // Perform ray tracing for each object
        let shadowRay = this.calculateShadowRay(hitPoint, lightPosition);
        if (this.isInShadow(shadowRay)) {
            // If the point is in shadow, skip rendering this point
            return;
        }
    }
    // add to compute pass
    pass.setPipeline(this._computePipeline);                // set the compute pipeline
    pass.setBindGroup(0, this._bindGroup);                  // bind the buffer
    pass.dispatchWorkgroups(Math.ceil(this._wgWidth / 16), Math.ceil(this._wgHeight / 16)); // dispatch
  }
}