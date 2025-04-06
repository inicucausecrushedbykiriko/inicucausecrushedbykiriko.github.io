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

/* 
 * Copyright (c) 2025 SingChun LEE @ Bucknell University.
 * CC BY-NC 4.0 (https://creativecommons.org/licenses/by-nc/4.0/) 
 *
 * This code is provided mainly for educational purposes at Bucknell University.
 * You are free to adapt and share this non-commercially, with attribution.
 */

/* 
 * Copyright (c) 2025 SingChun LEE @ Bucknell University.
 * CC BY-NC 4.0 (https://creativecommons.org/licenses/by-nc/4.0/) 
 *
 * This code is provided mainly for educational purposes at Bucknell University.
 */

import SceneObject from '/quest4/lib/DSViz/SceneObject.js'

export default class ParticleSystemObject extends SceneObject {
  constructor(device, canvasFormat, numParticles = 4096) {
    super(device, canvasFormat);
    this._numParticles = numParticles;
    this._step = 0;
  }

  // Called by the renderer once the object is appended
  async createGeometry() {
    await this.createParticleGeometry();
  }
  
  // 1) Allocate CPU arrays & GPU ping-pong buffers
  async createParticleGeometry() {
    // Each particle: 6 floats => [ x, y, ix, iy, vx, vy ]
    this._particles = new Float32Array(this._numParticles * 6);

    // Create two GPU buffers, each big enough for all particles
    this._particleBuffers = [
      this._device.createBuffer({
        label: "Particle Buffer 0 " + this.getName(),
        size:  this._particles.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
      }),
      this._device.createBuffer({
        label: "Particle Buffer 1 " + this.getName(),
        size:  this._particles.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
      })
    ];

    // Initialize particle data on CPU, then copy to GPU buffer
    this.resetParticles();
  }

  // 2) CPU helper to randomize positions & velocities, then write to the "in" buffer
  resetParticles() {
    for (let i = 0; i < this._numParticles; ++i) {
      const offset = i * 6;
      // random pos in [-1,1]
      const rx = Math.random() * 2 - 1;
      const ry = Math.random() * 2 - 1;

      // x,y
      this._particles[offset + 0] = rx;
      this._particles[offset + 1] = ry;
      // ix, iy
      this._particles[offset + 2] = rx;
      this._particles[offset + 3] = ry;
      // velocity
      this._particles[offset + 4] = (Math.random() - 0.5) * 0.01;
      this._particles[offset + 5] = (Math.random() - 0.5) * 0.01;
    }

    this._step = 0;
    this._device.queue.writeBuffer(
      this._particleBuffers[0], // "in" buffer for step=0
      0,
      this._particles
    );
  }

  // Called each frame before rendering (if needed)
  updateGeometry() {
    // If you want CPU-based changes, do them here
    // e.g. this._device.queue.writeBuffer(...) if you changed data
  }

  // 3) Create bind group layout, specifying read vs. write usage
  async createShaders() {
    const shaderCode = await this.loadShader("/quest4/shaders/particles.wgsl");
    this._shaderModule = this._device.createShaderModule({
      label: "Particles Shader " + this.getName(),
      code: shaderCode
    });

    // The big fix: read-only storage can be VERTEX | COMPUTE,
    // but read-write storage must be COMPUTE only
    this._bindGroupLayout = this._device.createBindGroupLayout({
      label: "Particle BGL " + this.getName(),
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" }
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" }
        }
      ]
    });

    this._pipelineLayout = this._device.createPipelineLayout({
      label: "Particles Pipeline Layout",
      bindGroupLayouts: [this._bindGroupLayout]
    });
  }

  // 4) Create the render pipeline (vertex+fragment) for drawing
  async createRenderPipeline() {
    this._particlePipeline = this._device.createRenderPipeline({
      label: "Particles Render Pipeline " + this.getName(),
      layout: this._pipelineLayout,
      vertex: {
        module: this._shaderModule,
        entryPoint: "vertexMain"
      },
      fragment: {
        module: this._shaderModule,
        entryPoint: "fragmentMain",
        targets: [{ format: this._canvasFormat }]
      },
      primitive: {
        topology: "line-strip"
      }
    });

    // Create ping-pong bind groups:
    // For step=even => read from buffer[0], write to buffer[1]
    // For step=odd  => read from buffer[1], write to buffer[0]
    this._bindGroups = [
      this._device.createBindGroup({
        layout: this._particlePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this._particleBuffers[0] } },
          { binding: 1, resource: { buffer: this._particleBuffers[1] } }
        ]
      }),
      this._device.createBindGroup({
        layout: this._particlePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this._particleBuffers[1] } },
          { binding: 1, resource: { buffer: this._particleBuffers[0] } }
        ]
      })
    ];
  }

  // 5) Called by the renderer each frame: do the draw call
  render(pass) {
    pass.setPipeline(this._particlePipeline);
    // read from whichever buffer is "in" for this frame
    pass.setBindGroup(0, this._bindGroups[this._step % 2]);
    // draw 128 vertices for each of the N particles
    pass.draw(128, this._numParticles);
  }

  // 6) Create the compute pipeline to update the particles
  async createComputePipeline() {
    this._computePipeline = this._device.createComputePipeline({
      label: "Particles Compute Pipeline " + this.getName(),
      layout: this._pipelineLayout,
      compute: {
        module: this._shaderModule,
        entryPoint: "computeMain"
      }
    });
  }

  // 7) Called by the renderer each frame: do the compute pass
  compute(pass) {
    pass.setPipeline(this._computePipeline);
    pass.setBindGroup(0, this._bindGroups[this._step % 2]);
    // One dispatch per particle, grouped by 256
    pass.dispatchWorkgroups(Math.ceil(this._numParticles / 256));
    this._step++;
  }
}
