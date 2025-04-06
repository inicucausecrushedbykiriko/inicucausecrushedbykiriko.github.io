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
  constructor(device, canvasFormat, numParticles = 10000, fireAndSmoke = false) {
    super(device, canvasFormat);
    this._numParticles = numParticles;
    this._step = 0;

    // param buffer: [ gravityScale, mouseX, mouseY, mouseActive ]
    this._param = new Float32Array([1.0, 0.0, 0.0, 0.0]);

    this._fireAndSmoke = fireAndSmoke; // if true => we do negative life for smoke
  }

  async createGeometry() {
    await this.createParticleGeometry();
    await this.createRadialTexture(); // for glow or smoke
  }

  // We store 8 floats per particle: x,y, ix,iy, vx,vy, age, life
  // If life < 0 => "smoke", else => colored spark
  async createParticleGeometry() {
    this._particles = new Float32Array(this._numParticles * 8);

    this._particleBuffers = [
      this._device.createBuffer({
        label: "Particle Buf 0",
        size: this._particles.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
      }),
      this._device.createBuffer({
        label: "Particle Buf 1",
        size: this._particles.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
      })
    ];

    // param uniform
    this._paramBuffer = this._device.createBuffer({
      label: "Param Buf",
      size: this._param.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    // We'll render each particle as a small quad (two triangles)
    const quadData = new Float32Array([
      // x,   y,  u, v
      0,0,   0,0,
      1,0,   1,0,
      0,1,   0,1,

      1,0,   1,0,
      1,1,   1,1,
      0,1,   0,1
    ]);
    this._vertexCount = 6;
    this._quadBuffer = this._device.createBuffer({
      label: "Quad Verts",
      size: quadData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
    this._device.queue.writeBuffer(this._quadBuffer, 0, quadData);

    this.resetParticles();
  }

  // Make a small radial gradient texture => for glow or smoke effect
  async createRadialTexture() {
    const size = 32;
    const channelCount = 4;
    const data = new Uint8Array(size * size * channelCount);

    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        const idx = (j*size + i) * channelCount;
        let dx = i - size/2;
        let dy = j - size/2;
        let dist = Math.sqrt(dx*dx + dy*dy) / (size/2);
        if (dist > 1.0) dist = 1.0;
        let alpha = 1.0 - dist;
        data[idx+0] = 255;
        data[idx+1] = 255;
        data[idx+2] = 255;
        data[idx+3] = Math.floor(alpha * 255);
      }
    }

    this._radialTex = this._device.createTexture({
      label: "Radial Tex",
      size: { width: size, height: size },
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    });
    this._device.queue.writeTexture(
      { texture: this._radialTex },
      data,
      { bytesPerRow: size*channelCount },
      { width: size, height: size }
    );
    this._radialSampler = this._device.createSampler({
      label: "Radial Sampler",
      magFilter: "linear",
      minFilter: "linear"
    });
  }

  // CPU-based reset => ~30% negative => smoke
  resetParticles() {
    for (let i = 0; i < this._numParticles; i++) {
      let off = i*8;
      let rx = Math.random()*2 - 1;
      let ry = Math.random()*2 - 1;
      // position
      this._particles[off+0] = rx;
      this._particles[off+1] = ry;
      // init pos
      this._particles[off+2] = rx;
      this._particles[off+3] = ry;

      // smaller velocity => slower
      this._particles[off+4] = (Math.random()-0.5)*0.003;
      this._particles[off+5] = (Math.random()-0.5)*0.003;

      // age=0
      this._particles[off+6] = 0.0;

      // if fireAndSmoke => ~30% negative => smoke
      let isSmoke = false;
      if (this._fireAndSmoke && Math.random() < 0.3) {
        isSmoke = true;
      }
      let lifeVal = Math.floor(Math.random()*240 + 60); // 60..300
      if (isSmoke) lifeVal = -lifeVal; // store negative => smoke
      this._particles[off+7] = lifeVal;
    }
    this._step=0;
    this._device.queue.writeBuffer(this._particleBuffers[0],0, this._particles);
  }

  updateGeometry() {}

  async createShaders() {
    // specialized WGSL => no wind, non-linear fade, smoke vs color
    const code = await this.loadShader("/quest4/shaders/particles-fireAndSmoke.wgsl");
    this._shaderModule = this._device.createShaderModule({
      label: "Particles FireAndSmoke",
      code
    });

    this._bindGroupLayout = this._device.createBindGroupLayout({
      label: "Particle BGL",
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
        },
        {
          binding: 3,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {}
        },
        {
          binding: 4,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {}
        }
      ]
    });

    this._pipelineLayout = this._device.createPipelineLayout({
      label: "Particle Layout",
      bindGroupLayouts: [ this._bindGroupLayout ]
    });
  }

  async createRenderPipeline() {
    // We'll do alpha blending => so smoke can overlay
    this._particlePipeline = this._device.createRenderPipeline({
      label: "Particle Render Pipeline",
      layout: this._pipelineLayout,
      vertex: {
        module: this._shaderModule,
        entryPoint: "vertexMain",
        buffers: [{
          arrayStride: 4*Float32Array.BYTES_PER_ELEMENT, // x,y,u,v
          attributes: [
            { shaderLocation: 0, format: "float32x2", offset: 0 },
            { shaderLocation: 1, format: "float32x2", offset: 2*4 }
          ]
        }]
      },
      fragment: {
        module: this._shaderModule,
        entryPoint: "fragmentMain",
        targets: [{
          format: this._canvasFormat,
          blend: {
            color: {
              srcFactor: 'one',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add'
            },
            alpha: {
              srcFactor: 'one',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add'
            }
          }
        }]
      },
      primitive: { topology: "triangle-list" }
    });

    let texView = this._radialTex.createView();
    let sampler = this._radialSampler;

    this._bindGroups = [
      this._device.createBindGroup({
        layout: this._particlePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this._particleBuffers[0] } },
          { binding: 1, resource: { buffer: this._particleBuffers[1] } },
          { binding: 2, resource: { buffer: this._paramBuffer } },
          { binding: 3, resource: texView },
          { binding: 4, resource: sampler }
        ]
      }),
      this._device.createBindGroup({
        layout: this._particlePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this._particleBuffers[1] } },
          { binding: 1, resource: { buffer: this._particleBuffers[0] } },
          { binding: 2, resource: { buffer: this._paramBuffer } },
          { binding: 3, resource: texView },
          { binding: 4, resource: sampler }
        ]
      })
    ];
  }

  render(pass) {
    pass.setPipeline(this._particlePipeline);
    pass.setBindGroup(0, this._bindGroups[this._step % 2]);
    pass.setVertexBuffer(0, this._quadBuffer);
    pass.draw(this._vertexCount, this._numParticles);
  }

  async createComputePipeline() {
    this._computePipeline = this._device.createComputePipeline({
      label: "Particle Compute",
      layout: this._pipelineLayout,
      compute: {
        module: this._shaderModule,
        entryPoint: "computeMain"
      }
    });
  }

  compute(pass) {
    pass.setPipeline(this._computePipeline);
    pass.setBindGroup(0, this._bindGroups[this._step % 2]);
    pass.dispatchWorkgroups(Math.ceil(this._numParticles / 256));
    this._step++;
  }

  // Param editing
  modifyGravity(delta) {
    this._param[0] += delta;
    if (this._param[0]<0) this._param[0] = 0;
    this._device.queue.writeBuffer(this._paramBuffer, 0, this._param);
  }
  setMousePosition(nx, ny) {
    this._param[1] = nx;
    this._param[2] = ny;
    this._device.queue.writeBuffer(this._paramBuffer, 0, this._param);
  }
  setMouseActive(on) {
    this._param[3] = on?1:0;
    this._device.queue.writeBuffer(this._paramBuffer, 0, this._param);
  }
}
