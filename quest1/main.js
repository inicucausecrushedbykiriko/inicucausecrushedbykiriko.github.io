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

  const vertices = new Float32Array([
    // Triangle
    0.0,  0.5,  1.0, 0.0, 0.0,
   -0.5, -0.5,  0.0, 1.0, 0.0,
    0.5, -0.5,  0.0, 0.0, 1.0,

    // Square
    -0.3, 0.3,  0.5, 0.5, 1.0,
    -0.3, -0.3, 0.5, 0.5, 1.0,
     0.3,  0.3, 0.5, 0.5, 1.0,
     0.3, -0.3, 0.5, 0.5, 1.0,
  ]);

  const vertexBuffer = device.createBuffer({
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, vertices);

  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: device.createShaderModule({
        code: `
        @vertex
        fn main(@location(0) position : vec2<f32>, @location(1) color : vec3<f32>) -> @builtin(position) vec4<f32> {
          return vec4(position, 0.0, 1.0);
        }
        `,
      }),
      entryPoint: 'main',
      buffers: [
        {
          arrayStride: 5 * Float32Array.BYTES_PER_ELEMENT,
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x2' },
            { shaderLocation: 1, offset: 8, format: 'float32x3' },
          ],
        },
      ],
    },
    fragment: {
      module: device.createShaderModule({
        code: `
        @fragment
        fn main(@location(1) color : vec3<f32>) -> @location(0) vec4<f32> {
          return vec4(color, 1.0);
        }
        `,
      }),
      entryPoint: 'main',
      targets: [{ format }],
    },
    primitive: {
      topology: 'triangle-list',
    },
  });

  const encoder = device.createCommandEncoder();
  const pass = encoder.beginRenderPass({
    colorAttachments: [{
      view: context.getCurrentTexture().createView(),
      clearValue: { r: 0, g: 0, b: 0, a: 1 },
      loadOp: 'clear',
      storeOp: 'store',
    }],
  });

  pass.setPipeline(pipeline);
  pass.setVertexBuffer(0, vertexBuffer);
  pass.draw(6, 1, 0, 0);
  pass.end();
  device.queue.submit([encoder.finish()]);
}

initWebGPU().catch(console.error);
