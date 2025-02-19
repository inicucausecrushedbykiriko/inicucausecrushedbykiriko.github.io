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

import SceneObject from "/quest3/lib/DSViz/SceneObject.js";

export default class CameraLineStrip2DAliveDeadObject extends SceneObject {
  constructor(device, canvasFormat, cameraPose, vertices) {
    super(device, canvasFormat);

    this.gridResolution = 2048; // Renamed for clarity
    this.paused = false;
    this.activeRuleSet = true; // Clearer variable name
    this._cameraPose = cameraPose;
    this._vertices = vertices instanceof Float32Array ? vertices : new Float32Array(vertices);

    this._pipelineLayout = null; // Ensure it's initialized
    this._shaderModule = null; // Store shader reference
  }


  async createComputePipeline(shaderName = "computeMain") {
    if (!this._shaderModule) {
      console.warn("Shader module not loaded before compute pipeline creation!");
      return;
    }
  
    this._computePipeline = this._device.createComputePipeline({
      label: `Compute Pipeline - ${this.getName()}`,
      layout: this._pipelineLayout,
      compute: {
        module: this._shaderModule,
        entryPoint: shaderName,
      },
    });
  }

  
  // Setup geometry buffers for WebGPU
  async createGeometry() {
    this._vertexBuffer = this._device.createBuffer({
      label: `Vertex Buffer - ${this.getName()}`,
      size: this._vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this._device.queue.writeBuffer(this._vertexBuffer, 0, this._vertices);
    this._vertexBufferLayout = {
      arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT,
      attributes: [{ shaderLocation: 0, format: "float32x2", offset: 0 }],
    };
  }

  // Update camera position data on GPU
  updateCameraPose() {
    this._device.queue.writeBuffer(this._cameraPoseBuffer, 0, this._cameraPose);
  }

  // Load and compile shaders
  async createShaders() {
    const shaderCode = await this.loadShader("./shaders/camera2dalivedead.wgsl");
    this._shaderModule = this._device.createShaderModule({
      label: `Shader Module - ${this.getName()}`,
      code: shaderCode,
    });
  }

  // Setup the WebGPU pipeline layout
  async createPipelineLayout() {
    if (!this._shaderModule) {
      console.warn("Shader module not loaded before pipeline creation!");
      return;
    }

    this._pipelineLayout = this._device.createPipelineLayout({
      label: `Pipeline Layout - ${this.getName()}`,
      bindGroupLayouts: [this._bindGroupLayout], // Ensure `_bindGroupLayout` exists
    });
  }

  // Create rendering pipeline
  async createRenderPipeline() {
    if (!this._pipelineLayout) {
      await this.createPipelineLayout(); // Ensure pipeline layout is ready
    }

    this._renderPipeline = this._device.createRenderPipeline({
      label: `Render Pipeline - ${this.getName()}`,
      layout: this._pipelineLayout,
      vertex: {
        module: this._shaderModule,
        entryPoint: "vertexMain",
        buffers: [this._vertexBufferLayout],
      },
      fragment: {
        module: this._shaderModule,
        entryPoint: "fragmentMain",
        targets: [{ format: this._canvasFormat }],
      },
      primitive: { topology: "triangle-list" },
    });
  }

  // WebGPU rendering logic
  render(pass) {
    pass.setPipeline(this._renderPipeline);
    pass.setVertexBuffer(0, this._vertexBuffer);
    pass.draw(this._vertices.length / 2, this.gridResolution * this.gridResolution);
  }

  // Toggle simulation pause state
  togglePause() {
    this.paused = !this.paused;
  }

  // Reset and refresh the simulation
  async refreshSimulation() {
    this._step = 0;

    await this.createGeometry();
    await this.createShaders();
    await this.createPipelineLayout();
    await this.createRenderPipeline();

    this._device.queue.writeBuffer(this._cellStateBuffers[0], 0, this._cellStatus);
    this.paused = false;
  }

  // Toggle between rule sets
  toggleRule() {
    this.activeRuleSet = !this.activeRuleSet;
    this.refreshSimulation();
  }
}

