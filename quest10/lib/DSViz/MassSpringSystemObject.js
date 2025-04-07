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

import SceneObject from '/lib/DSViz/SceneObject.js'

export default class MassSpringSystemObject extends SceneObject {
  constructor(device, canvasFormat, numParticles = 16) {
    super(device, canvasFormat);
    this._numParticles = numParticles;
    this._numSprings = Math.ceil(numParticles * 2);
    this._step = 0;
  }
  
  async createGeometry() { 
    await this.createParticleGeometry();
    await this.createSpringGeometry();
  }
  
  async createParticleGeometry() {
    // Create particles
    this._particles = new Float32Array(this._numParticles * 8); // [x, y, vx, vy, dx, dy, m, -]
    // Create vertex+storage buffer to store the particles in GPU
    this._particleBuffers = [
      this._device.createBuffer({
        label: "Particles Buffer 1 " + this.getName(),
        size: this._particles.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      }),
      this._device.createBuffer({
        label: "Particles Buffer 2 " + this.getName(),
        size: this._particles.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      })
    ];
    this.resetParticles();
  }
    
  async createSpringGeometry() {
    // TODO 1: create the strings memory in both CPU and GPU
    // Use _numSprings to determine the size
    // Create a storage buffer in GPU for it
    // Name the CPU array as `_springs`
    
    
    
    // call the resetSprings to initialize the springs and copy to GPU
    this.resetSprings();
  }
    
  resetParticles() {
    for (let i = 0; i < this._numParticles; ++i) {
      this._particles[8 * i + 0] = (Math.random() - 0.5) * 0.5;
      this._particles[8 * i + 1] = (Math.random() - 0.5) * 0.5 + 0.4;
      this._particles[8 * i + 2] = 0;
      this._particles[8 * i + 3] = 0;
      this._particles[8 * i + 4] = 0;
      this._particles[8 * i + 5] = 0;
      this._particles[8 * i + 6] = (Math.random()) * 0.025 + 0.01;
      this._particles[8 * i + 7] = 0;
    }
    // Copy from CPU to GPU
    this._step = 0;
    this._device.queue.writeBuffer(this._particleBuffers[this._step % 2], 0, this._particles);
  }
  
  resetSprings() {
    var mapped = new Map();
    for (let i = 0; i < this._numParticles; ++i) {
      mapped[i] = new Set();
      mapped[i].add(i); // we do not connect a spring to itself
    }
    for (let i = 0; i < this._numSprings; ++i) {
      // ptA, ptB, rest length, stiffness
      this._springs[4 * i + 0] = Math.floor(Math.random() * this._numParticles); 
      while (mapped[this._springs[4 * i + 0]].length == this._numParticles) { // already connected to all possible particles
        this._springs[4 * i + 0] = Math.floor(Math.random() * this._numParticles);
      }
      this._springs[4 * i + 1] = Math.floor(Math.random() * this._numParticles);
      while (mapped[this._springs[4 * i + 0]].has(this._springs[4 * i + 1])) { // find a new one
        this._springs[4 * i + 1] = Math.floor(Math.random() * this._numParticles);
      }
      mapped[this._springs[4 * i + 0]].add(this._springs[4 * i + 1]);
      this._springs[4 * i + 2] = Math.random() * 0.05 + 0.05;
      this._springs[4 * i + 3] = (Math.random() * 0.1 + 0.1);
    }
    // Copy from CPU to GPU
    this._step = 0;
    this._device.queue.writeBuffer(this._springBuffer, 0, this._springs);
  }
  
  updateGeometry() { }
  
  async createShaders() {
    let shaderCode = await this.loadShader("/shaders/massspring.wgsl");
    this._shaderModule = this._device.createShaderModule({
      label: "Particles Shader " + this.getName(),
      code: shaderCode,
    });
    // TODO 2: Create the bind group layout for the three storage buffers
    this._bindGroupLayout = this._device.createBindGroupLayout({
      // fill in the layout speficiations
      
      
      
    });
    this._pipelineLayout = this._device.createPipelineLayout({
      label: "Particles Pipeline Layout",
      bindGroupLayouts: [ this._bindGroupLayout ],
    });
  }
  
  async createRenderPipeline() { 
    await this.createParticlePipeline();
    await this.createSpringPipeline();
  }
  
  async createParticlePipeline() {
    this._particlePipeline = this._device.createRenderPipeline({
      label: "Particles Render Pipeline " + this.getName(),
      layout: this._pipelineLayout,
      vertex: {
        module: this._shaderModule, 
        entryPoint: "vertexMain",
      },
      fragment: {
        module: this._shaderModule,
        entryPoint: "fragmentMain",
        targets: [{
          format: this._canvasFormat
        }]
      },
      primitives: {
        typology: 'line-strip'
      }
    }); 
    // TODO 3: Create bind group to bind the mass-spring systems
    this._bindGroups = [
      // create the two bind groups suitable for GPU computing
      
      
      
      
    ];
  }
  
  async createSpringPipeline() {
    this._springPipeline = this._device.createRenderPipeline({
      label: "Spring Render Pipeline " + this.getName(),
      layout: this._pipelineLayout,
      vertex: {
        module: this._shaderModule, 
        entryPoint: "vertexSpringMain",
      },
      fragment: {
        module: this._shaderModule,
        entryPoint: "fragmentSpringMain",
        targets: [{
          format: this._canvasFormat
        }]
      },
      primitives: {
        typology: 'line-list'
      }
    }); 
  }
  
  render(pass) { 
    // draw the springs using lines
    pass.setPipeline(this._springPipeline);
    pass.setBindGroup(0, this._bindGroups[this._step % 2]);
    pass.draw(12, this._numSprings);
    // draw the particles using circles
    pass.setPipeline(this._particlePipeline); 
    pass.setBindGroup(0, this._bindGroups[this._step % 2]);
    pass.draw(128, this._numParticles);
  }
  
  async createComputePipeline() { 
    this._computePipeline = this._device.createComputePipeline({
      label: "Particles Compute Pipeline " + this.getName(),
      layout: this._pipelineLayout,
      compute: {
        module: this._shaderModule,
        entryPoint: "computeMain",
      }
    });
    this._updatePipeline = this._device.createComputePipeline({
      label: "Particles Update Pipeline " + this.getName(),
      layout: this._pipelineLayout,
      compute: {
        module: this._shaderModule,
        entryPoint: "updateMain",
      }
    });
  }
  
  compute(pass) { 
    // compute the displacements using Hooke's Law
    pass.setPipeline(this._computePipeline);
    pass.setBindGroup(0, this._bindGroups[this._step % 2]);
    pass.dispatchWorkgroups(Math.ceil(this._numSprings / 256);
    // compute the new positions
    pass.setPipeline(this._updatePipeline);
    pass.setBindGroup(0, this._bindGroups[this._step % 2]);
    pass.dispatchWorkgroups(Math.ceil(this._numParticles / 256));
    ++this._step
  }
}
