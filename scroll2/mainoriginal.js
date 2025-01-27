async function initWebGPU() {
  // Create a canvas and add it to the render area
  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.getElementById('renderArea').appendChild(canvas);

  // Check WebGPU support
  if (!navigator.gpu) {
      console.error('WebGPU is not supported in this browser.');
      return;
  }

  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format });

  // Define triangle vertices (positions and colors)
  const vertices = new Float32Array([
      // x, y, r, g, b
      0.0,  0.5,  1.0, 0.0, 0.0, // Top (Red)
     -0.5, -0.5,  0.0, 1.0, 0.0, // Bottom-left (Green)
      0.5, -0.5,  0.0, 0.0, 1.0, // Bottom-right (Blue)
  ]);

  // Create vertex buffer
  const vertexBuffer = device.createBuffer({
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, vertices);

  // Define shaders
  const vertexShader = `
      @vertex
      fn main(@location(0) position: vec2f, @location(1) color: vec3f) -> @builtin(position) vec4f {
          return vec4f(position, 0.0, 1.0);
      }
  `;

  const fragmentShader = `
      @fragment
      fn main() -> @location(0) vec4f {
          return vec4f(1.0, 0.5, 0.5, 1.0); // Example color output
      }
  `;

  // Create render pipeline
  const pipeline = device.createRenderPipeline({
  });
}

initWebGPU().catch(console.error);
