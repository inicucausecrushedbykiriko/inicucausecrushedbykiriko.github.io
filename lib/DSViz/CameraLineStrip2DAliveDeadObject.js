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

import BaseSceneObject from "./lib/DSViz/SceneObject.js";

export default class DynamicGrid extends BaseSceneObject {
  constructor(device, canvasFormat, cameraPose, vertices) {
    super(device, canvasFormat);
    this.gridSize = 2048;
    this.isPaused = false;
    this.currentRule = true;
    this._cameraPose = cameraPose;
    this._vertices = vertices instanceof Float32Array ? vertices : new Float32Array(vertices);
  }

  async setupGeometry() {
    this._vertexBuffer = this._device.createBuffer({
      label: `Vertex Data - ${this.getName()}`,
      size: this._vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this._device.queue.writeBuffer(this._vertexBuffer, 0, this._vertices);
    this._vertexBufferLayout = {
      arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT,
      attributes: [{ shaderLocation: 0, format: "float32x2", offset: 0 }],
    };
  }

  refreshCamera() {
    this._device.queue.writeBuffer(this._cameraPoseBuffer, 0, this._cameraPose);
  }

  async setupShaders() {
    const shaderSource = await this.loadShader("./shaders/camera2dalivedead.wgsl");
    this._shaderModule = this._device.createShaderModule({
      label: `Shader Module - ${this.getName()}`,
      code: shaderSource,
    });
  }

  async buildRenderPipeline() {
    this._renderPipeline = this._device.createRenderPipeline({
      label: `Pipeline - ${this.getName()}`,
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

  render(pass) {
    pass.setPipeline(this._renderPipeline);
    pass.setVertexBuffer(0, this._vertexBuffer);
    pass.draw(this._vertices.length / 2, this.gridSize * this.gridSize);
  }

  togglePause() {
    this.isPaused = !this.isPaused;
  }

  resetSimulation() {
    this._step = 0;
    this.setupGeometry();
    this.setupShaders();
    this.buildRenderPipeline();
    this._device.queue.writeBuffer(this._cellStateBuffers[0], 0, this._cellStatus);
    this.isPaused = false;
  }

  toggleRule() {
    this.currentRule = !this.currentRule;
    this.resetSimulation();
  }
}
