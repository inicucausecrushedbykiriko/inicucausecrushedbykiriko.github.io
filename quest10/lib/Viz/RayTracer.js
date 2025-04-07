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

import Renderer from "/lib/Viz/2DRenderer.js"

export default class RayTracer extends Renderer {
  constructor(canvas) {
    super(canvas);
    this._tracer = null;
    this._heightFactor = 1.;
  }
  
  async init() {
    // Check if it supports WebGPU
    if (!navigator.gpu) {
      throw Error("WebGPU is not supported in this browser.");
    }
    // Get an GPU adapter
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw Error("Couldn't request WebGPU adapter.");
    }
    // Get a GPU device
    this._device = await adapter.requestDevice();
    // Get and set the context
    this._context = this._canvas.getContext("webgpu");
    //this._canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    this._canvasFormat = "rgba8unorm";
    this._context.configure({
      device: this._device,
      format: this._canvasFormat,
    });
    this._shaderModule = this._device.createShaderModule({
      label: "Ray Tracer Shader",
      code: `
      @vertex
      fn vertexMain(@builtin(vertex_index) vIdx: u32) -> @builtin(position) vec4f {
        var pos = array<vec2f, 6>(
          vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
          vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
        );
        return vec4f(pos[vIdx], 0, 1);
      }
      
      @group(0) @binding(0) var inTexture: texture_2d<f32>;
      @group(0) @binding(1) var inSampler: sampler;
      @group(0) @binding(2) var<uniform> imgSize: vec2f;
      
      @fragment
      fn fragmentMain(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
        let uv = fragCoord.xy / imgSize; // vec2f(textureDimensions(inTexture, 0));
        return textureSample(inTexture, inSampler, uv);
      }
      `
    });
    // Create camera buffer to store the camera pose and scale in GPU
    this._outputSizeBuffer = this._device.createBuffer({
      label: "Ray Tracer output size buffer",
      size: 8,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    }); 
    // create the pipeline to render the result on the canvas
    this._pipeline = this._device.createRenderPipeline({
      label: "Ray Tracer Pipeline",
      layout: "auto",
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
      }
    });
    this._sampler = this._device.createSampler({
      label: "Ray Tracer Sampler",
      magFilter: "linear",
      minFilter: "linear"
    });
    this.resizeCanvas();
    window.addEventListener('resize', this.resizeCanvas.bind(this));
  }
  
  resizeCanvas() {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const width = window.innerWidth * devicePixelRatio;
    const height = window.innerHeight * devicePixelRatio;
    const ratio = width/height;
    // NOTE: if yours is too slow, chante the target height here, e.g. 512
    this._tgtHeight = height * this._heightFactor; 
    let imgSize = { width: this._tgtHeight * ratio, height: this._tgtHeight};
    // resize screen images
    this._offScreenTexture = this._device.createTexture({
      size: imgSize,
      format: this._canvasFormat,
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING,
    });
    if (this._tracer) {
      this._tracer._imgWidth = this._offScreenTexture.width;
      this._tracer._imgHeight = this._offScreenTexture.height;
      this._tracer.updateGeometry();
      this._tracer.createBindGroup(this._offScreenTexture);
    }
    this._bindGroup = this._device.createBindGroup({
      label: "Ray Tracer Renderer Bind Group",
      layout: this._pipeline.getBindGroupLayout(0),
      entries: [{
        binding: 0,
        resource: this._offScreenTexture.createView()
      }, 
      {
        binding: 1,
        resource: this._sampler
      },
      {
        binding: 2,
        resource: { buffer: this._outputSizeBuffer }
      }],
    });
    super.resizeCanvas();
    // update the image size in the Shader
    this._device.queue.writeBuffer(this._outputSizeBuffer, 0, new Float32Array([width, height]));
  }
  
  async setTracerObject(obj) {
    await obj.init();
    obj._imgWidth = this._offScreenTexture.width;
    obj._imgHeight = this._offScreenTexture.height;
    obj.updateGeometry();
    this._tracer = obj;
    this._tracer.createBindGroup(this._offScreenTexture);
  }
  
  render() {
    // ray tracking compute commands
    if (this._tracer) {
      let encoder = this._device.createCommandEncoder();
      const computePass = encoder.beginComputePass();
      this._tracer.compute(computePass);
      computePass.end(); // end the pass
      this._device.queue.submit([encoder.finish()]);
    }
    // Attach the output view to see the result on the canvas
    // rendering commands
    let encoder = this._device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: this._context.getCurrentTexture().createView(),
        clearValue: this._clearColor,
        loadOp: "clear",
        storeOp: "store",
      }]
    });
    pass.setPipeline(this._pipeline);
    pass.setBindGroup(0, this._bindGroup);
    pass.draw(6); // Draw a quad with two triangles
    pass.end();
    this._device.queue.submit([encoder.finish()]);
  }
}
