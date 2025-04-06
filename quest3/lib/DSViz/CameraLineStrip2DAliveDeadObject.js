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
    this._cameraPose = cameraPose;
    this._vertices = vertices instanceof Float32Array ? vertices : new Float32Array(vertices);
    this._width = 2048;
    this._height = 2048;
    this._cellStatus = new Uint32Array(this._width * this._height);
    this._cellStateBuffers = [];
    this._step = 0;
    this._dragging = false;
    this._dragIdx = -1;
  }

  async init() {
    console.log("[CameraLineStrip2DAliveDeadObject] init called");
    await this.createGeometry();
    await this.createShaders();
    await this.createRenderPipeline();
    await this.createComputePipeline();
  }

  async createGeometry() {
    console.log("[CameraLineStrip2DAliveDeadObject] createGeometry called");

    this._vertexBuffer = this._device.createBuffer({
      label: "Vertices " + this.getName(),
      size: this._vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this._device.queue.writeBuffer(this._vertexBuffer, 0, this._vertices);

    this._vertexBufferLayout = {
      arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT,
      attributes: [{ shaderLocation: 0, format: "float32x2", offset: 0 }],
    };

    this._cameraPoseBuffer = this._device.createBuffer({
      label: "Camera Pose " + this.getName(),
      size: this._cameraPose.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this._device.queue.writeBuffer(this._cameraPoseBuffer, 0, this._cameraPose);

    this.randomizeCells();
    this._cellStateBuffers = [
      this._device.createBuffer({
        label: "Grid status Buffer 1",
        size: this._cellStatus.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      }),
      this._device.createBuffer({
        label: "Grid status Buffer 2",
        size: this._cellStatus.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      }),
    ];

    this.refreshGPUCellState();
  }

  randomizeCells() {
    console.log("[CameraLineStrip2DAliveDeadObject] randomizeCells() called");

    let aliveCount = 0;
    let everAliveCount = 0;

    for (let i = 0; i < this._cellStatus.length; i++) {
      const alive = Math.random() < 0.1;
      if (alive) {
        const isEverAlive = Math.random() < 0.001;
        this._cellStatus[i] = isEverAlive ? 3 : 1;
        if (isEverAlive) everAliveCount++;
        aliveCount++;
      } else {
        this._cellStatus[i] = 0;
      }
    }

    console.log(`Total alive cells: ${aliveCount}`);
    console.log(`Total ever-alive cells (3s): ${everAliveCount}`);
  }

  refreshGPUCellState() {
    const readBufIndex = this._step % 2;
    this._device.queue.writeBuffer(
      this._cellStateBuffers[readBufIndex],
      0,
      this._cellStatus
    );
  }

  toggleCell(x, y) {
    if (x < 0 || x >= this._width || y < 0 || y >= this._height) return;
    const idx = y * this._width + x;
    if (this._cellStatus[idx] !== 3) {
      this._cellStatus[idx] ^= 1;
      const readBufIndex = this._step % 2;
      this._device.queue.writeBuffer(
        this._cellStateBuffers[readBufIndex],
        idx * 4,
        this._cellStatus.subarray(idx, idx + 1)
      );
    }
  }

  startDragging(x, y) {
    const idx = y * this._width + x;
    if (this._cellStatus[idx] === 3) {
      this._dragging = true;
      this._dragIdx = idx;
    }
  }

  dragTo(x, y) {
    if (!this._dragging) return;
    if (x < 0 || x >= this._width || y < 0 || y >= this._height) return;
    const newIdx = y * this._width + x;
    if (this._dragIdx !== -1 && this._dragIdx !== newIdx) {
      this._cellStatus[this._dragIdx] = 0;
      this._cellStatus[newIdx] = 3;
      this._dragIdx = newIdx;
      const readBufIndex = this._step % 2;
      this._device.queue.writeBuffer(
        this._cellStateBuffers[readBufIndex],
        0,
        this._cellStatus
      );
    }
  }

  endDragging() {
    this._dragging = false;
    this._dragIdx = -1;
  }

  updateCameraPose() {
    this._device.queue.writeBuffer(this._cameraPoseBuffer, 0, this._cameraPose);
  }

  async createShaders() {
    let shaderCode = await this.loadShader("/quest3/shaders/camera2dalivedead.wgsl");
    this._shaderModule = this._device.createShaderModule({ label: "Shader", code: shaderCode });

    this._bindGroupLayout = this._device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: {} },
        { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }
      ]
    });

    this._pipelineLayout = this._device.createPipelineLayout({
      bindGroupLayouts: [this._bindGroupLayout],
    });
  }

  async createRenderPipeline() {
    this._renderPipeline = this._device.createRenderPipeline({
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
      primitive: { topology: "line-strip" },
    });

    this._bindGroups = [
      this._device.createBindGroup({
        layout: this._renderPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this._cameraPoseBuffer } },
          { binding: 1, resource: { buffer: this._cellStateBuffers[0] } },
          { binding: 2, resource: { buffer: this._cellStateBuffers[1] } }
        ],
      }),
      this._device.createBindGroup({
        layout: this._renderPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this._cameraPoseBuffer } },
          { binding: 1, resource: { buffer: this._cellStateBuffers[1] } },
          { binding: 2, resource: { buffer: this._cellStateBuffers[0] } }
        ],
      }),
    ];
  }

  async createComputePipeline() {
    this._computePipeline = this._device.createComputePipeline({
      layout: this._pipelineLayout,
      compute: {
        module: this._shaderModule,
        entryPoint: "computeMain",
      },
    });
  }

  render(pass) {
    pass.setPipeline(this._renderPipeline);
    pass.setVertexBuffer(0, this._vertexBuffer);
    pass.setBindGroup(0, this._bindGroups[this._step % 2]);
    pass.draw(this._vertices.length / 2, this._width * this._height);
  }

  compute(pass) {
    pass.setPipeline(this._computePipeline);
    pass.setBindGroup(0, this._bindGroups[this._step % 2]);
    pass.dispatchWorkgroups(Math.ceil(this._width / 4), Math.ceil(this._height / 4));
    ++this._step;
  }
}
