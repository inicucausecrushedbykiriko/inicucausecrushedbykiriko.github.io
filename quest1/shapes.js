export function initializeCanvas(drawCallback) {
  const canvas = document.createElement('canvas');
  canvas.id = 'renderCanvas';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.getElementById('renderArea').appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('2D context is not supported.');
    return;
  }

  drawCallback(ctx);
}