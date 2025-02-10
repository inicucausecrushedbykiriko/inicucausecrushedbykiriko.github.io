// circle.js

// Convert an HSL color to RGB
// h, s, l ∈ [0..1], returns [r, g, b] in [0..1].
function hslToRgb(h, s, l) {
  let c = (1 - Math.abs(2 * l - 1)) * s;
  let x = c * (1 - Math.abs(((h * 360) / 60) % 2 - 1));
  let m = l - c / 2;
  
  let r1, g1, b1;
  if      (0 <= h && h < 1/6) { r1 = c; g1 = x; b1 = 0; }
  else if (1/6 <= h && h < 2/6) { r1 = x; g1 = c; b1 = 0; }
  else if (2/6 <= h && h < 3/6) { r1 = 0; g1 = c; b1 = x; }
  else if (3/6 <= h && h < 4/6) { r1 = 0; g1 = x; b1 = c; }
  else if (4/6 <= h && h < 5/6) { r1 = x; g1 = 0; b1 = c; }
  else { r1 = c; g1 = 0; b1 = x; }
  
  return [r1 + m, g1 + m, b1 + m];
}

/**
* Generates a rainbow sun with a pointillism effect inside.
*
* @param {number} radius       The radius of the sun.
* @param {number} numSegments  The number of segments for the sun’s boundary.
* @param {number} numDots      The number of small dots for the pointillism effect.
* @returns {Float32Array}      The vertex data for rendering.
*/
export default function circleMaker(radius = 0.3, numSegments = 72, numDots = 200) {
  const floatsPerVertex = 6;
  const verticesPerSegment = 3;
  const totalFloats = (numSegments * verticesPerSegment + numDots * verticesPerSegment) * floatsPerVertex;

  let angleStep = (2 * Math.PI) / numSegments;
  let data = new Float32Array(totalFloats);
  let offset = 0;

  // --------------------------
  // 1) Generate Rainbow Sun Boundary
  // --------------------------
  for (let i = 0; i < numSegments; i++) {
      let theta1 = i * angleStep;
      let theta2 = ((i + 1) % numSegments) * angleStep;

      let hue1 = theta1 / (2 * Math.PI);
      let hue2 = theta2 / (2 * Math.PI);
      let [r1, g1, b1] = hslToRgb(hue1, 1, 0.5);
      let [r2, g2, b2] = hslToRgb(hue2, 1, 0.5);

      // 1) Center vertex (black core)
      data[offset++] = 0; // x
      data[offset++] = 0; // y
      data[offset++] = 0; // r
      data[offset++] = 0; // g
      data[offset++] = 0; // b
      data[offset++] = 1; // alpha

      // 2) Boundary vertex at angle1
      data[offset++] = radius * Math.cos(theta1);
      data[offset++] = radius * Math.sin(theta1);
      data[offset++] = r1;
      data[offset++] = g1;
      data[offset++] = b1;
      data[offset++] = 1;

      // 3) Boundary vertex at angle2
      data[offset++] = radius * Math.cos(theta2);
      data[offset++] = radius * Math.sin(theta2);
      data[offset++] = r2;
      data[offset++] = g2;
      data[offset++] = b2;
      data[offset++] = 1;
  }

  // --------------------------
  // 2) Generate Pointillism Dots Inside the Sun
  // --------------------------
  for (let i = 0; i < numDots; i++) {
      let dotAngle = Math.random() * 2 * Math.PI; // Random angle
      let dotRadius = Math.random() * radius * 0.9; // Random distance from center
      let dotSize = Math.random() * (radius * 0.07) + (radius * 0.02); // Dot size (2-7% of radius)

      let x = dotRadius * Math.cos(dotAngle);
      let y = dotRadius * Math.sin(dotAngle);

      // Get a random color from a nearby boundary point
      let hue = dotAngle / (2 * Math.PI);
      let [r, g, b] = hslToRgb(hue, 1, 0.5);

      for (let j = 0; j < numSegments; j++) {
          let theta1 = j * angleStep;
          let theta2 = ((j + 1) % numSegments) * angleStep;

          let x1 = dotSize * Math.cos(theta1);
          let y1 = dotSize * Math.sin(theta1);
          let x2 = dotSize * Math.cos(theta2);
          let y2 = dotSize * Math.sin(theta2);

          // 1) Center of the dot
          data[offset++] = x;
          data[offset++] = y;
          data[offset++] = r;
          data[offset++] = g;
          data[offset++] = b;
          data[offset++] = 1;

          // 2) Boundary vertex 1
          data[offset++] = x + x1;
          data[offset++] = y + y1;
          data[offset++] = r;
          data[offset++] = g;
          data[offset++] = b;
          data[offset++] = 1;

          // 3) Boundary vertex 2
          data[offset++] = x + x2;
          data[offset++] = y + y2;
          data[offset++] = r;
          data[offset++] = g;
          data[offset++] = b;
          data[offset++] = 1;
      }
  }

  return data;
}
