async function initWebGPU() {
  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.getElementById('renderArea').appendChild(canvas);

  if (!navigator.gpu) {
    console.error('WebGPU is not supported in this browser.');
    return;
  }

  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format });

  // Vertices for triangle and square
  const vertices = new Float32Array([
    // Triangle
    0.0,  0.5,  1.0, 0.0, 0.0, // Top (Red)
   -0.5, -0.5,  0.0, 1.0, 0.0, // Bottom-left (Green)
    0.5, -0.5,  0.0, 0.0, 1.0, // Bottom-right (Blue)

    // Square
   -0.3,  0.3,  1.0, 1.0, 0.0, // Top-left (Yellow)
   -0.3, -0.3,  1.0, 0.0, 1.0, // Bottom-left (Purple)
    0.3,  0.3,  0.0, 1.0, 1.0, // Top-right (Cyan)
    0.3, -0.3,  0.5, 0.5, 0.5, // Bottom-right (Gray)
  ]);

  const vertexBuffer = device.createBuffer({
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, vertices);

  const vertexShader = `
    @vertex
    fn main(
      @location(0) position: vec2f,
      @location(1) color: vec3f
    ) -> @builtin(position) vec4f {
      return vec4f(position, 0.0, 1.0);
    }
  `;

  const fragmentShader = `
    @fragment
    fn main(
      @location(1) color: vec3f
    ) -> @location(0) vec4f {
      return vec4f(color, 1.0);
    }
  `;

  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: device.createShaderModule({ code: vertexShader }),
      entryPoint: 'main',
      buffers: [
        {
          arrayStride: 20,
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x2' },
            { shaderLocation: 1, offset: 8, format: 'float32x3' },
          ],
        },
      ],
    },
    fragment: {
      module: device.createShaderModule({ code: fragmentShader }),
      entryPoint: 'main',
      targets: [{ format }],
    },
    primitive: {
      topology: 'triangle-list',
    },
  });

  const commandEncoder = device.createCommandEncoder();
  const textureView = context.getCurrentTexture().createView();
  const renderPass = commandEncoder.beginRenderPass({
    colorAttachments: [
      {
        view: textureView,
        clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  });

  renderPass.setPipeline(pipeline);
  renderPass.setVertexBuffer(0, vertexBuffer);
  renderPass.draw(3, 1, 0, 0); // Draw the triangle
  renderPass.draw(4, 1, 3, 0); // Draw the square
  renderPass.end();

  device.queue.submit([commandEncoder.finish()]);
}

initWebGPU().catch(console.error);
