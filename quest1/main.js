async function init() {
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
      // Square
      -0.7, 0.7, 1.0, 0.0, 0.0,
      -0.7, -0.7, 1.0, 0.0, 0.0,
      0.7, 0.7, 1.0, 0.0, 0.0,
      0.7, -0.7, 1.0, 0.0, 0.0,
  
      // Triangle
      0.0, 0.8, 0.0, 1.0, 0.0,
      -0.5, 0.0, 0.0, 1.0, 0.0,
      0.5, 0.0, 0.0, 1.0, 0.0,
  
      // Star (Complex Shape)
      0.0, 0.4, 0.0, 0.0, 1.0,
      -0.2, -0.2, 0.0, 0.0, 1.0,
      0.2, -0.2, 0.0, 0.0, 1.0,
    ]);
  
    const vertexBuffer = device.createBuffer({
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertexBuffer, 0, vertices);
  
    // Shader code and pipeline setup would go here.
  }
  
  init();
  