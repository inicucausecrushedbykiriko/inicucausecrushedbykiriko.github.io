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
import SceneObject from '/quest4/lib/DSViz/SceneObject.js'

export default class ParticleSystemObject extends SceneObject {
  constructor(device, canvasFormat, numParticles = 4096) {
    super(device, canvasFormat);
    this._numParticles = numParticles;
    this._step = 0;

    // param[0] = gravityScale
    // param[1] = mouseX
    // param[2] = mouseY
    // param[3] = mouseActive
    this._param = new Float32Array([1.0, 0.0, 0.0, 0.0]);
  }

  // Called by the renderer once the object is appended
  async createGeometry() {
    await this.createParticleGeometry();
  }
  
  // 1) Allocate CPU arrays & GPU ping-pong buffers
  async createParticleGeometry() {
    // Each particle has 8 floats => [ x, y, ix, iy, vx, vy, age, life ]
    this._particles = new Float32Array(this._numParticles * 8);

    // Create two GPU buffers, each big enough for all particles
    this._particleBuffers = [
      this._device.createBuffer({
        label: "Particle Buffer A " + this.getName(),
        size:  this._particles.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
      }),
      this._device.createBuffer({
        label: "Particle Buffer B " + this.getName(),
        size:  this._particles.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
      })
    ];

    // Also create a small uniform buffer for param data
    this._paramBuffer = this._device.createBuffer({
      label: "Param Buffer " + this.getName(),
      size:  this._param.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    // Initialize data on CPU, then copy to GPU buffer
    this.resetParticles();
  }

  // 2) CPU helper to randomize positions, velocities, lifespans, then write to "in" buffer
  resetParticles() {
    for (let i = 0; i < this._numParticles; ++i) {
      const offset = i * 8;

      // random pos in [-1,1]
      const rx = Math.random() * 2 - 1;
      const ry = Math.random() * 2 - 1;

      // (x, y)
      this._particles[offset + 0] = rx;
      this._particles[offset + 1] = ry;
      // (ix, iy) for respawning at initial location
      this._particles[offset + 2] = rx;
      this._particles[offset + 3] = ry;

      // velocity
      this._particles[offset + 4] = (Math.random() - 0.5) * 0.01; // vx
      this._particles[offset + 5] = (Math.random() - 0.5) * 0.01; // vy

      // age = 0 initially
      this._particles[offset + 6] = 0.0; 
      // life = random between 60..300 frames
      this._particles[offset + 7] = Math.floor(Math.random() * 120.0 + 30.0); 
    }

    this._step = 0;
    // Write CPU array into the first buffer (the "in" buffer)
    this._device.queue.writeBuffer(
      this._particleBuffers[0],
      0,
      this._particles
    );
  }

  // Called each frame before rendering (if needed)
  updateGeometry() {}

  // 3) Create bind group layout
  async createShaders() {
    const shaderCode = await this.loadShader("/quest4/shaders/particles.wgsl");
    this._shaderModule = this._device.createShaderModule({
      label: "Particles Shader " + this.getName(),
      code: shaderCode
    });

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
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" }
        }
      ]
    });

    this._pipelineLayout = this._device.createPipelineLayout({
      label: "Particles Pipeline Layout",
      bindGroupLayouts: [this._bindGroupLayout]
    });
  }

  // 4) Create the render pipeline (vertex+fragment)
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

    // ping-pong bind groups: 
    // step even => in=buf[0], out=buf[1]
    // step odd => in=buf[1], out=buf[0]
    this._bindGroups = [
      this._device.createBindGroup({
        layout: this._particlePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this._particleBuffers[0] } },
          { binding: 1, resource: { buffer: this._particleBuffers[1] } },
          { binding: 2, resource: { buffer: this._paramBuffer } }
        ]
      }),
      this._device.createBindGroup({
        layout: this._particlePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this._particleBuffers[1] } },
          { binding: 1, resource: { buffer: this._particleBuffers[0] } },
          { binding: 2, resource: { buffer: this._paramBuffer } }
        ]
      })
    ];
  }

  // 5) Called each frame: do the draw call
  render(pass) {
    pass.setPipeline(this._particlePipeline);
    pass.setBindGroup(0, this._bindGroups[this._step % 2]);
    pass.draw(128, this._numParticles);
  }

  // 6) Create the compute pipeline
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
    pass.dispatchWorkgroups(Math.ceil(this._numParticles / 256));
    this._step++;
  }

  // Additional methods to control param buffer:
  modifyGravity(delta) {
    // param[0] = gravityScale
    this._param[0] += delta;
    if (this._param[0] < 0.0) {
      this._param[0] = 0.0; // don't let it go negative
    }
    this._device.queue.writeBuffer(this._paramBuffer, 0, this._param);
  }

  setMousePosition(nx, ny) {
    // param[1], param[2] = mouseX, mouseY
    this._param[1] = nx;
    this._param[2] = ny;
    this._device.queue.writeBuffer(this._paramBuffer, 0, this._param);
  }

  setMouseActive(isActive) {
    // param[3] = mouseActive
    this._param[3] = isActive ? 1.0 : 0.0;
    this._device.queue.writeBuffer(this._paramBuffer, 0, this._param);
  }
}
