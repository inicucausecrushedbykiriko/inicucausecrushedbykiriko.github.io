// circleMaker.js

// Convert an HSL color to RGB
// h, s, l ∈ [0..1], returns [r, g, b] in [0..1].
function hslToRgb(h, s, l) {
    // Based on standard HSL-to-RGB conversion
    let c = (1 - Math.abs(2*l - 1)) * s;
    let x = c * (1 - Math.abs(((h * 360)/60) % 2 - 1));
    let m = l - c/2;
    
    let r1, g1, b1;
    if      (0 <= h && h < 1/6) { r1 = c; g1 = x; b1 = 0; }
    else if (1/6 <= h && h < 2/6) { r1 = x; g1 = c; b1 = 0; }
    else if (2/6 <= h && h < 3/6) { r1 = 0; g1 = c; b1 = x; }
    else if (3/6 <= h && h < 4/6) { r1 = 0; g1 = x; b1 = c; }
    else if (4/6 <= h && h < 5/6) { r1 = x; g1 = 0; b1 = c; }
    else { r1 = c; g1 = 0; b1 = x; }
    
    return [r1 + m, g1 + m, b1 + m];
  }
  
  export default function circleMaker(radius = 0.3, numSegments = 72) {
    // Each slice (segment) is drawn as one triangle:
    //   - Vertex 1: circle center (same for all triangles)
    //   - Vertex 2: boundary at angle i
    //   - Vertex 3: boundary at angle i+1
    //
    // Each vertex has (x, y, r, g, b, a). So each segment uses 3 vertices × 6 floats = 18 floats.
    
    const floatsPerVertex = 6;
    const verticesPerSegment = 3;
    const totalFloats = numSegments * verticesPerSegment * floatsPerVertex;
    
    let angleStep = (2 * Math.PI) / numSegments;
    let data = new Float32Array(totalFloats);
    
    for (let i = 0; i < numSegments; i++) {
      let theta1 = i * angleStep;
      let theta2 = ((i + 1) % numSegments) * angleStep;
  
      // For boundary color, we’ll convert angle to a hue in [0..1],
      // then use full saturation = 1, lightness = 0.5 for a bright rainbow color.
      // Vertex at angle1
      let hue1 = (theta1 / (2 * Math.PI)); 
      let [r1, g1, b1] = hslToRgb(hue1, 1, 0.5);
  
      // Vertex at angle2
      let hue2 = (theta2 / (2 * Math.PI)); 
      let [r2, g2, b2] = hslToRgb(hue2, 1, 0.5);
  
      // We store 3 vertices: center, vertex1, vertex2.
      // offset in the Float32Array
      let offset = i * verticesPerSegment * floatsPerVertex;
      
      // 1) Center vertex (black)
      data[offset + 0] = 0;    // x
      data[offset + 1] = 0;    // y
      data[offset + 2] = 0;    // r
      data[offset + 3] = 0;    // g
      data[offset + 4] = 0;    // b
      data[offset + 5] = 1;    // alpha
  
      // 2) Boundary vertex at angle1
      data[offset + 6]  = radius * Math.cos(theta1); // x
      data[offset + 7]  = radius * Math.sin(theta1); // y
      data[offset + 8]  = r1;  // r
      data[offset + 9]  = g1;  // g
      data[offset + 10] = b1;  // b
      data[offset + 11] = 1;   // alpha
  
      // 3) Boundary vertex at angle2
      data[offset + 12] = radius * Math.cos(theta2);
      data[offset + 13] = radius * Math.sin(theta2);
      data[offset + 14] = r2;
      data[offset + 15] = g2;
      data[offset + 16] = b2;
      data[offset + 17] = 1;
    }
    
    return data;
  }
  