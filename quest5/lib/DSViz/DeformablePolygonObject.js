/*!
 * DeformablePolygonObject.js
 *
 * Implements a simple PBD-like deformable polygon.
 * Compute shaders use a fixed-size uniform struct.
 * Deformation is off by default; it can be toggled.
 * Also supports reset to original state.
 */

/*!
 * DeformablePolygonObject.js
 *
 * Implements a simple PBD-like deformable polygon.
 * The compute shaders use a fixed-size uniform struct.
 * Initially, deformation is off.
 * Keys:
 *   S: switch shape (handled in quest5.js)
 *   D: toggle deformation simulation on/off
 *   R: reset current shape to original state
 * The text overlay shows instructions and whether the mouse is inside.
 */

import SceneObject from "/quest5/lib/DSViz/SceneObject.js";
import Polygon from "/quest5/lib/DS/Polygon.js";

export default class DeformablePolygonObject extends SceneObject {
  constructor(device, canvasFormat, filename) {
    super(device, canvasFormat);
    this._filename = filename;
    this._params = {
      gravity: -0.6,
      floorY: -0.9,
      mouseX: 0.0,
      mouseY: 0.0,
      mouseDown: 0.0
    };
    this._mouseDown = false;
    this._mousePos = [0, 0];
    // Deformation is off by default.
    this._deformEnabled = false;
    this._polygon = new Polygon(filename);
    // Save original polygon for resetting.
    this._originalPolygon = null;
  }
  
  async createGeometry() {
    await this._polygon.init();
    // Save a copy of the original polygon (including duplicate closing vertex)
    this._originalPolygon = JSON.parse(JSON.stringify(this._polygon._polygon));
    const poly = this._polygon._polygon;
    // Use the full vertex array so that the closing edge is drawn.
    this._numV = poly.length;
    const floatsPerVert = 6; // [x, y, oldx, oldy, restLenPrev, restLenNext]
    let data = new Float32Array(this._numV * floatsPerVert);
    
    function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }
    
    for (let i = 0; i < this._numV; i++) {
      let v = poly[i];
      data[i * floatsPerVert + 0] = v[0];
      data[i * floatsPerVert + 1] = v[1];
      data[i * floatsPerVert + 2] = v[0];
      data[i * floatsPerVert + 3] = v[1];
    }
    // Compute rest lengths for unique vertices (ignore duplicate closing vertex)
    for (let i = 0; i < this._numV - 1; i++) {
      let iPrev = (i - 1 + (this._numV - 1)) % (this._numV - 1);
      let iNext = (i + 1) % (this._numV - 1);
      let x0 = data[i * floatsPerVert + 0], y0 = data[i * floatsPerVert + 1];
      let xp = data[iPrev * floatsPerVert + 0], yp = data[iPrev * floatsPerVert + 1];
      let xn = data[iNext * floatsPerVert + 0], yn = data[iNext * floatsPerVert + 1];
      data[i * floatsPerVert + 4] = dist(x0, y0, xp, yp);
      data[i * floatsPerVert + 5] = dist(x0, y0, xn, yn);
    }
    // For the closing vertex, simply copy the values from the first vertex.
    let last = (this._numV - 1) * floatsPerVert;
    data[last + 4] = data[0 + 4];
    data[last + 5] = data[0 + 5];
    
    this._mainBuf = this._device.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX
    });
    this._device.queue.writeBuffer(this._mainBuf, 0, data);
    
    this._numVertices = this._numV;
    this._vertexBufferLayout = {
      arrayStride: floatsPerVert * 4,
      attributes: [
        {
          shaderLocation: 0,
          offset: 0,
          format: "float32x2"
        }
      ]
    };
    
    this._paramBuf = this._device.createBuffer({
      size: 32, // 8 floats = 32 bytes
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    
    const canvas = document.getElementById("renderCanvas");
    canvas.addEventListener("mousedown", () => {
      this._mouseDown = true;
      this._params.mouseDown = 1.0;
    });
    canvas.addEventListener("mouseup", () => {
      this._mouseDown = false;
      this._params.mouseDown = 0.0;
    });
    canvas.addEventListener("mousemove", (evt) => {
      const rect = canvas.getBoundingClientRect();
      const sx = evt.clientX - rect.left;
      const sy = evt.clientY - rect.top;
      const ndcx = (sx / canvas.width) * 2 - 1;
      const ndcy = 1 - (sy / canvas.height) * 2;
      this._mousePos = [ndcx, ndcy];
    });
  }
  
  async createShaders() {
    this._computeShaderGravity = `
      struct UniformParams {
        gravity   : f32,
        floorY    : f32,
        mouseX    : f32,
        mouseY    : f32,
        mouseDown : f32,
        _pad0     : f32,
        _pad1     : f32,
        _pad2     : f32,
      };
      
      struct Vertex {
        pos : vec2f,
        old : vec2f,
        lp  : f32,
        ln  : f32,
      };
      
      @group(0) @binding(0) var<storage, read_write> verts: array<Vertex>;
      @group(0) @binding(1) var<uniform> params: UniformParams;
      
      @compute @workgroup_size(64)
      fn gravityMain(@builtin(global_invocation_id) gid: vec3u) {
        let i = gid.x;
        if (i >= arrayLength(&verts)) { return; }
        var v = verts[i];
        
        let g  = params.gravity;
        let fy = params.floorY;
        let mx = params.mouseX;
        let my = params.mouseY;
        let md = params.mouseDown;
        
        let vx = v.pos.x - v.old.x;
        var vy = v.pos.y - v.old.y;
        let dt = 0.0167;
        vy = vy + g * dt;
        
        v.old = v.pos;
        var nx = v.pos.x + vx;
        var ny = v.pos.y + vy;
        
        if (ny < fy) { ny = fy; }
        if (md > 0.5) {
          let dx = mx - nx;
          let dy = my - ny;
          let dist2 = dx * dx + dy * dy;
          if (dist2 < 0.02) {
            nx = nx + dx * 0.3;
            ny = ny + dy * 0.3;
          }
        }
        v.pos = vec2f(nx, ny);
        verts[i] = v;
      }
    `;
    
    this._computeShaderConstraints = `
      struct Vertex {
        pos : vec2f,
        old : vec2f,
        lp  : f32,
        ln  : f32,
      };
      
      @group(0) @binding(0) var<storage, read_write> verts: array<Vertex>;
      
      @compute @workgroup_size(64)
      fn constraintMain(@builtin(global_invocation_id) gid: vec3u) {
        let i = gid.x;
        let N = arrayLength(&verts);
        if (i >= N) { return; }
        let iPrev = (i + N - 1u) % N;
        let iNext = (i + 1u) % N;
        var v = verts[i];
        var vp = verts[iPrev];
        var vn = verts[iNext];
        
        let dP = vp.pos - v.pos;
        let lenP = sqrt(dP.x * dP.x + dP.y * dP.y) + 1e-9;
        let diffP = 0.5 * (lenP - v.lp) / lenP;
        v.pos = v.pos + dP * diffP;
        vp.pos = vp.pos - dP * diffP;
        verts[iPrev] = vp;
        
        let dN = vn.pos - v.pos;
        let lenN = sqrt(dN.x * dN.x + dN.y * dN.y) + 1e-9;
        let diffN = 0.5 * (lenN - v.ln) / lenN;
        v.pos = v.pos + dN * diffN;
        vn.pos = vn.pos - dN * diffN;
        verts[iNext] = vn;
        
        verts[i] = v;
      }
    `;
    
    this._renderShader = `
      @vertex
      fn vsMain(@location(0) position: vec2f) -> @builtin(position) vec4f {
        return vec4f(position, 0, 1);
      }
      @fragment
      fn fsMain() -> @location(0) vec4f {
        return vec4f(1.0, 0.6, 0.0, 1.0);
      }
    `;
    
    this._moduleGravity = this._device.createShaderModule({ code: this._computeShaderGravity });
    this._moduleConstraints = this._device.createShaderModule({ code: this._computeShaderConstraints });
    this._renderModule = this._device.createShaderModule({ code: this._renderShader });
  }
  
  async createRenderPipeline() {
    this._renderPipeline = this._device.createRenderPipeline({
      label: "DeformableRenderPipeline " + this.getName(),
      layout: "auto",
      vertex: {
        module: this._renderModule,
        entryPoint: "vsMain",
        buffers: [this._vertexBufferLayout]
      },
      fragment: {
        module: this._renderModule,
        entryPoint: "fsMain",
        targets: [{ format: this._canvasFormat }]
      },
      primitive: {
        topology: "line-strip"
      }
    });
    
    const gravityBGLayout = this._device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      ]
    });
    this._pipelineGravity = this._device.createComputePipeline({
      layout: this._device.createPipelineLayout({ bindGroupLayouts: [gravityBGLayout] }),
      compute: { module: this._moduleGravity, entryPoint: "gravityMain" }
    });
    
    const constraintBGLayout = this._device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }
      ]
    });
    this._pipelineConstraints = this._device.createComputePipeline({
      layout: this._device.createPipelineLayout({ bindGroupLayouts: [constraintBGLayout] }),
      compute: { module: this._moduleConstraints, entryPoint: "constraintMain" }
    });
  }
  
  computeBindGroups() {
    this._bgGravity = this._device.createBindGroup({
      layout: this._pipelineGravity.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this._mainBuf } },
        { binding: 1, resource: { buffer: this._paramBuf } },
      ]
    });
    this._bgConstraints = this._device.createBindGroup({
      layout: this._pipelineConstraints.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this._mainBuf } },
      ]
    });
  }
  
  updateGeometry() {
    this._params.mouseX = this._mousePos[0];
    this._params.mouseY = this._mousePos[1];
  }
  
  render(pass) {
    pass.setPipeline(this._renderPipeline);
    pass.setVertexBuffer(0, this._mainBuf);
    pass.draw(this._numVertices);
  }
  
  async createComputePipeline() {}
  
  compute(passEnc) {
    // Run compute only if deformation is enabled.
    if (!this._deformEnabled) return;
    
    const arr = new Float32Array([
      this._params.gravity,
      this._params.floorY,
      this._params.mouseX,
      this._params.mouseY,
      this._params.mouseDown,
      0, 0, 0
    ]);
    this._device.queue.writeBuffer(this._paramBuf, 0, arr);
    
    this.computeBindGroups();
    
    passEnc.setPipeline(this._pipelineGravity);
    passEnc.setBindGroup(0, this._bgGravity);
    passEnc.dispatchWorkgroups(Math.ceil(this._numVertices / 64));
    
    passEnc.setPipeline(this._pipelineConstraints);
    for (let i = 0; i < 5; i++) {
      passEnc.setBindGroup(0, this._bgConstraints);
      passEnc.dispatchWorkgroups(Math.ceil(this._numVertices / 64));
    }
  }
  
  toggleDeformation() {
    this._deformEnabled = !this._deformEnabled;
  }
  
  async resetShape() {
    // Reset the polygon to its original state.
    this._polygon._polygon = JSON.parse(JSON.stringify(this._originalPolygon));
    await this.createGeometry();
  }
}
