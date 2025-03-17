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
    // This class assumes each vertex has (x, y).
    // We'll use it to render a line-strip as a small square per cell,
    // with instance drawing for each cell in a 256×256 grid.

    this._cameraPose = cameraPose;

    // Ensure we store vertices in a Float32Array
    if (vertices instanceof Float32Array) {
      this._vertices = vertices;
    } else {
      this._vertices = new Float32Array(vertices);
    }

    // Set up grid dimensions for Game of Life
    this._width = 2048;
    this._height = 2048;

    // Prepare a CPU-side array to hold the cell status: 0 = dead, 1 = alive
    // You could later expand your logic to store special states, etc.
    this._cellStatus = new Uint32Array(this._width * this._height);

    // We will have two buffers in GPU memory (ping-pong) to store the cell status
    this._cellStateBuffers = [];
    this._step = 0;
  }

  async createGeometry() {
    // 1) Create the vertex buffer to store the square's line-strip vertices.
    this._vertexBuffer = this._device.createBuffer({
      label: "Vertices " + this.getName(),
      size: this._vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    // Copy vertex data from CPU to GPU
    this._device.queue.writeBuffer(this._vertexBuffer, 0, this._vertices);

    // 2) Define the vertex buffer layout
    this._vertexBufferLayout = {
      arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT,
      attributes: [
        {
          // position 0 has two floats (x, y)
          shaderLocation: 0,
          format: "float32x2",
          offset: 0,
        },
      ],
    };

    // 3) Create the camera pose buffer
    this._cameraPoseBuffer = this._device.createBuffer({
      label: "Camera Pose " + this.getName(),
      size: this._cameraPose.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this._device.queue.writeBuffer(this._cameraPoseBuffer, 0, this._cameraPose);

    // 4) Initialize the cell array on CPU (random or custom). For now, let's do random.
    this.randomizeCells();

    // 5) Create the two GPU buffers (ping-pong) for cell status
    this._cellStateBuffers = [
      this._device.createBuffer({
        label: "Grid status Buffer 1 " + this.getName(),
        size: this._cellStatus.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      }),
      this._device.createBuffer({
        label: "Grid status Buffer 2 " + this.getName(),
        size: this._cellStatus.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      }),
    ];
    // Copy the initial cell state into the first buffer
    this._device.queue.writeBuffer(this._cellStateBuffers[0], 0, this._cellStatus);
  }

  /**
   * Randomly initialize all cells (30% chance to be alive).
   * Called in createGeometry before uploading to GPU.
   */
  randomizeCells() {
    for (let i = 0; i < this._cellStatus.length; i++) {
      this._cellStatus[i] = Math.random() < 0.3 ? 1 : 0;
    }
  }

  /**
   * Toggle a single cell at CPU side (useful for mouse input).
   * Then write the updated cell to the current read buffer (ping-pong).
   */
  toggleCell(x, y) {
    if (x < 0 || x >= this._width || y < 0 || y >= this._height) return;
    const idx = y * this._width + x;
    this._cellStatus[idx] = this._cellStatus[idx] ^ 1; // flip 0->1 or 1->0

    // Which buffer is the current read buffer?
    const readBufIndex = this._step % 2;
    // Write the single cell's updated state back to GPU
    this._device.queue.writeBuffer(
      this._cellStateBuffers[readBufIndex],
      idx * 4, // each Uint32 element is 4 bytes
      this._cellStatus.subarray(idx, idx + 1)
    );
  }

  // Update camera pose on GPU
  updateCameraPose() {
    this._device.queue.writeBuffer(this._cameraPoseBuffer, 0, this._cameraPose);
  }

  async createShaders() {
    // Load our WGSL file, which includes vertexMain, fragmentMain, and computeMain
    let shaderCode = await this.loadShader("/quest3/shaders/camera2dalivedead.wgsl");
    this._shaderModule = this._device.createShaderModule({
      label: "Shader " + this.getName(),
      code: shaderCode,
    });

    // Create the bind group layout for camera + cell states
    this._bindGroupLayout = this._device.createBindGroupLayout({
      label: "Grid Bind Group Layout " + this.getName(),
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {}, // camera uniform
        },
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" }, // read-only old state
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" }, // writable new state
        },
      ],
    });
    this._pipelineLayout = this._device.createPipelineLayout({
      label: "Grid Pipeline Layout",
      bindGroupLayouts: [this._bindGroupLayout],
    });
  }

  async createRenderPipeline() {
    this._renderPipeline = this._device.createRenderPipeline({
      label: "Render Pipeline " + this.getName(),
      layout: this._pipelineLayout,
      vertex: {
        module: this._shaderModule,
        entryPoint: "vertexMain",
        buffers: [this._vertexBufferLayout],
      },
      fragment: {
        module: this._shaderModule,
        entryPoint: "fragmentMain",
        targets: [
          {
            format: this._canvasFormat,
          },
        ],
      },
      primitive: {
        // Instead of triangles, we use line-strip for each cell's 5-vertex square outline.
        topology: "line-strip",
      },
    });

    // Create two bind groups for ping-pong
    this._bindGroups = [
      this._device.createBindGroup({
        label: "Renderer Bind Group 1 " + this.getName(),
        layout: this._renderPipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: { buffer: this._cameraPoseBuffer },
          },
          {
            binding: 1,
            resource: { buffer: this._cellStateBuffers[0] },
          },
          {
            binding: 2,
            resource: { buffer: this._cellStateBuffers[1] },
          },
        ],
      }),
      this._device.createBindGroup({
        label: "Renderer Bind Group 2 " + this.getName(),
        layout: this._renderPipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: { buffer: this._cameraPoseBuffer },
          },
          {
            binding: 1,
            resource: { buffer: this._cellStateBuffers[1] },
          },
          {
            binding: 2,
            resource: { buffer: this._cellStateBuffers[0] },
          },
        ],
      }),
    ];
  }

  render(pass) {
    // Use our render pipeline and bind group to draw
    pass.setPipeline(this._renderPipeline);
    pass.setVertexBuffer(0, this._vertexBuffer);
    pass.setBindGroup(0, this._bindGroups[this._step % 2]);

    // We have 5 vertices for the square outline,
    // and we instance 256*256 times (one for each cell).
    pass.draw(this._vertices.length / 2, this._width * this._height);
  }

  async createComputePipeline() {
    this._computePipeline = this._device.createComputePipeline({
      label: "Grid update pipeline " + this.getName(),
      layout: this._pipelineLayout,
      compute: {
        module: this._shaderModule,
        entryPoint: "computeMain",
      },
    });
  }

  compute(pass) {
    // Execute the compute pipeline to update cells for the next frame
    pass.setPipeline(this._computePipeline);
    pass.setBindGroup(0, this._bindGroups[this._step % 2]);

    // Our grid is 256×256, and if the compute shader uses @workgroup_size(4,4),
    // we need 256/4 = 64 in x and y dimensions:
    pass.dispatchWorkgroups(Math.ceil(this._width / 4), Math.ceil(this._height / 4));

    // Move to the next step, flipping ping-pong buffers
    ++this._step;
  }
}
