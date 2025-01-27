async function init() {
  const canvas = document.createElement("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.getElementById("renderArea").appendChild(canvas);

  if (!navigator.gpu) {
    console.error("WebGPU is not supported in this browser.");
    return;
  }

  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const context = canvas.getContext("webgpu");
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format });

  // Define vertices for shapes
  const vertices = new Float32Array([
    // Triangle
    0.0, 0.6, 1.0, 0.0, 0.0,
   -0.6, -0.3, 0.0, 1.0, 0.0,
    0.6, -0.3, 0.0, 0.0, 1.0,

    // Square
   -0.3, 0.3, 1.0, 1.0, 0.0,
   -0.3, -0.3, 0.0, 1.0, 1.0,
    0.3, 0.3, 1.0, 0.5, 0.5,
    0.3, -0.3, 0.5, 0.5, 1.0,

    // Star (complex shape)
    0.0,  0.5,  1.0, 0.0, 1.0,
   -0.2,  0.1,  0.5, 1.0, 0.5,
    0.2,  0.1,  0.5, 0.5, 1.0,
   -0.4, -0.2,  1.0, 1.0, 0.0,
    0.4, -0.2,  0.5, 0.0, 1.0,
  ]);

  const vertexBuffer = device.createBuffer({
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, vertices);

  // Shaders
  const shaderCode = `
    @vertex
    fn vertexMain(@location(0) pos: vec2f, @location(1) color: vec3f) -> @builtin(position) vec4f {
      return vec4f(pos, 0.0, 1.0);
    }

    @fragment
    fn fragmentMain(@location(1) color: vec3f) -> @location(0) vec4f {
      return vec4f(color, 1.0);
    }
  `;

  const shaderModule = device.createShaderModule({ code: shaderCode });

  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: shaderModule,
      entryPoint: "vertexMain",
      buffers: [
        {
          arrayStride: 20,
          attributes: [
            { format: "float32x2", offset: 0, shaderLocation: 0 },
            { format: "float32x3", offset: 8, shaderLocation: 1 },
          ],
        },
      ],
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fragmentMain",
      targets: [{ format }],
    },
    primitive: { topology: "triangle-list" },
  });

  const commandEncoder = device.createCommandEncoder();
  const pass = commandEncoder.beginRenderPass({
    colorAttachments: [{
      view: context.getCurrentTexture().createView(),
      clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1 },
      loadOp: "clear",
      storeOp: "store",
    }],
  });

  pass.setPipeline(pipeline);
  pass.setVertexBuffer(0, vertexBuffer);
  pass.draw(3, 1, 0, 0); // Triangle
  pass.draw(4, 1, 3, 0); // Square
  pass.draw(5, 1, 7, 0); // Star
  pass.end();

  device.queue.submit([commandEncoder.finish()]);
}

init();
