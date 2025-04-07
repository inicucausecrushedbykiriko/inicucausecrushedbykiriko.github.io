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

import SceneObject from "/lib/DSViz/SceneObject.js"
import Polygon from "/lib/DS/Polygon.js"

export default class PolygonObject extends SceneObject {
  constructor(device, canvasFormat, filename) {
    super(device, canvasFormat);
    this._polygon = new Polygon(filename);
  }
  
  async createGeometry() {
    // Read vertices from polygon files
    await this._polygon.init();
    this._numV = this._polygon._numV;
    this._dim = this._polygon._dim;
    this._vertices = this._polygon._polygon.flat();
    // Create vertex buffer to store the vertices in GPU
    this._vertexBuffer = this._device.createBuffer({
      label: "Vertices Normals and More " + this.getName(),
      size: this._vertices.length * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });
    // Copy from CPU to GPU
    new Float32Array(this._vertexBuffer.getMappedRange()).set(this._vertices);
    this._vertexBuffer.unmap();
    // Defne vertex buffer layout - how the GPU should read the buffer
    this._vertexBufferLayout = {
      arrayStride: this._dim * Float32Array.BYTES_PER_ELEMENT,
      attributes: [
      { // vertices
        format: "float32x"+this._dim.toString(), // 32 bits, each has two/three coordiantes
        offset: 0,
        shaderLocation: 0, // position in the vertex shader
      },
      ]
    };
  }
  
  async createShaders() {
    let shaderCode = await this.loadShader("/shaders/standard2d.wgsl");
    this._shaderModule = this._device.createShaderModule({
      label: "Shader " + this.getName(),
      code: shaderCode,
    }); 
  }
  
  async createRenderPipeline() {
    this._renderPipeline = this._device.createRenderPipeline({
      label: "Render Pipeline " + this.getName(),
      layout: "auto",
      vertex: {
        module: this._shaderModule,     // the shader code
        entryPoint: "vertexMain",          // the shader function
        buffers: [this._vertexBufferLayout] // the binded buffer layout
      },
      fragment: {
        module: this._shaderModule,     // the shader code
        entryPoint: "fragmentMain",        // the shader function
        targets: [{
          format: this._canvasFormat        // the target canvas format
        }]
      },
      primitive: {
        topology: 'line-strip'
      }
    }); 
  }
  
  render(pass) {
    // add to render pass to draw the plane
    pass.setPipeline(this._renderPipeline);
    pass.setVertexBuffer(0, this._vertexBuffer); // bind the vertex buffer
    pass.draw(this._numV);         // draw all vertices
  }
  
  async createComputePipeline() {}
  
  compute(pass) {}
}
