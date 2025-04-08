// LaplacianInterpolation.js
export function laplacianInterpolationUniform(vertices, neighbors) {
    let newVertices = [];
    for (let i = 0; i < vertices.length; i++) {
      let sum = {x: 0, y: 0, z: 0};
      let neighborCount = neighbors[i].length;
      
      // Sum up the positions of the neighboring vertices
      neighbors[i].forEach(neighborIndex => {
        sum.x += vertices[neighborIndex].x;
        sum.y += vertices[neighborIndex].y;
        sum.z += vertices[neighborIndex].z;
      });
      
      // Take the average position
      newVertices.push({
        x: sum.x / neighborCount,
        y: sum.y / neighborCount,
        z: sum.z / neighborCount,
      });
    }
    return newVertices;
  }
  
  export function laplacianInterpolationEdgeLength(vertices, neighbors) {
    let newVertices = [];
    for (let i = 0; i < vertices.length; i++) {
      let weightedSum = {x: 0, y: 0, z: 0};
      let totalWeight = 0;
      
      // Calculate the weighted sum based on edge lengths
      neighbors[i].forEach(neighborIndex => {
        let dx = vertices[neighborIndex].x - vertices[i].x;
        let dy = vertices[neighborIndex].y - vertices[i].y;
        let dz = vertices[neighborIndex].z - vertices[i].z;
        let distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        let weight = 1.0 / distance;
        
        weightedSum.x += weight * vertices[neighborIndex].x;
        weightedSum.y += weight * vertices[neighborIndex].y;
        weightedSum.z += weight * vertices[neighborIndex].z;
        totalWeight += weight;
      });
      
      // Normalize the weighted sum
      newVertices.push({
        x: weightedSum.x / totalWeight,
        y: weightedSum.y / totalWeight,
        z: weightedSum.z / totalWeight,
      });
    }
    return newVertices;
  }
  
  export function laplacianInterpolationArea(vertices, faces, neighbors) {
    let newVertices = [];
    
    // Function to calculate the area of a triangle formed by three vertices
    function calculateTriangleArea(v1, v2, v3) {
      let ax = v2.x - v1.x;
      let ay = v2.y - v1.y;
      let az = v2.z - v1.z;
      let bx = v3.x - v1.x;
      let by = v3.y - v1.y;
      let bz = v3.z - v1.z;
      let crossX = ay * bz - az * by;
      let crossY = az * bx - ax * bz;
      let crossZ = ax * by - ay * bx;
      return 0.5 * Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ);
    }
  
    for (let i = 0; i < vertices.length; i++) {
      let weightedSum = {x: 0, y: 0, z: 0};
      let totalWeight = 0;
      
      // Loop through the neighboring faces and calculate the area-based weights
      neighbors[i].forEach(neighborIndex => {
        // Find the faces containing vertex `i` and `neighborIndex`
        let weight = 0;
        for (let face of faces) {
          if (face.includes(i) && face.includes(neighborIndex)) {
            let v1 = vertices[face[0]];
            let v2 = vertices[face[1]];
            let v3 = vertices[face[2]];
            weight = calculateTriangleArea(v1, v2, v3);
            break;
          }
        }
        
        weightedSum.x += weight * vertices[neighborIndex].x;
        weightedSum.y += weight * vertices[neighborIndex].y;
        weightedSum.z += weight * vertices[neighborIndex].z;
        totalWeight += weight;
      });
      
      // Normalize the weighted sum
      newVertices.push({
        x: weightedSum.x / totalWeight,
        y: weightedSum.y / totalWeight,
        z: weightedSum.z / totalWeight,
      });
    }
    return newVertices;
  }
  