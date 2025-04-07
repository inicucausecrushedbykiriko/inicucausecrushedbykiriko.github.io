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
/*!
 * PolygonObject.js
 *
 * Renders a polygon (from polygon._polygon) as a line-strip.
 */

import SceneObject from "/quest5/lib/DSViz/SceneObject.js";
import Polygon from "/quest5/lib/DS/Polygon.js";

export default class PolygonObject extends SceneObject {
  constructor(device, canvasFormat, filename) {
    super(device, canvasFormat);
    this._polygon = new Polygon(filename);
  }
  
  async createGeometry() {
    await this._polygon.init();
    // Use full vertex count so the duplicate first vertex is drawn.
    this._numV = this._polygon._polygon.length;
    this._dim = this._polygon._polygon[0].length;
    this._vertices = this._polygon._polygon.flat();
    
    this._vertexBuffer = this._device.createBuffer({
      label: "Polygon Vertices " + this.getName(),
      size: this._vertices.length * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });
    new Float32Array(this._vertexBuffer.getMappedRange()).set(this._vertices);
    this._vertexBuffer.unmap();
    
    this._vertexBufferLayout = {
      arrayStride: this._dim * 4,
      attributes: [
        {
          format: "float32x" + this._dim,
          offset: 0,
          shaderLocation: 0,
        }
      ]
    };
  }
  
  async createShaders() {
    const code = await this.loadShader("/quest5/shaders/standard2d.wgsl");
    this._shaderModule = this._device.createShaderModule({
      label: "PolygonShader " + this.getName(),
      code
    });
  }
  
  async createRenderPipeline() {
    this._renderPipeline = this._device.createRenderPipeline({
      label: "PolygonRenderPipeline " + this.getName(),
      layout: "auto",
      vertex: {
        module: this._shaderModule,
        entryPoint: "vertexMain",
        buffers: [this._vertexBufferLayout]
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
  }
  
  render(pass) {
    pass.setPipeline(this._renderPipeline);
    pass.setVertexBuffer(0, this._vertexBuffer);
    pass.draw(this._numV);
  }
  
  async createComputePipeline() {}
  compute(pass) {}
}
