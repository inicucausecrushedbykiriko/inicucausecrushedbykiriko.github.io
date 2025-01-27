import { initializeCanvas } from './shapes.js';

function drawUniverse(ctx) {
  // Black background
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Draw the sun (red sphere)
  ctx.beginPath();
  ctx.arc(200, 300, 50, 0, 2 * Math.PI);
  ctx.fillStyle = "red";
  ctx.fill();

  // Draw the moon (blue crescent)
  ctx.beginPath();
  ctx.arc(500, 200, 40, 0.2 * Math.PI, 1.8 * Math.PI, true);
  ctx.lineTo(490, 220);
  ctx.arc(490, 220, 30, 0.2 * Math.PI, 1.8 * Math.PI);
  ctx.closePath();
  ctx.fillStyle = "blue";
  ctx.fill();

  // Draw the star (yellow hexagon)
  const drawHexagon = (cx, cy, size, color) => {
    const path = new Path2D();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const x = cx + size * Math.cos(angle);
      const y = cy + size * Math.sin(angle);
      if (i === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    }
    path.closePath();
    ctx.fillStyle = color;
    ctx.fill(path);
  };

  drawHexagon(350, 400, 50, "yellow"); // Star
}

initializeCanvas(drawUniverse);
