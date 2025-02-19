/* 
 * Copyright (c) 2025 SingChun LEE @ Bucknell University. CC BY-NC 4.0.
 * 
 * This code is provided mainly for educational purposes at Bucknell University.
 *
 * This code is licensed under the Creative Commons Attribution-NonCommerical 4.0
 * International License. To view a copy of the license, visit 
 *   https://creativecommons.org/licenses/by-nc/4.0/
 * or send a letter to Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
 *
 * You are free to:
 *  - Share: copy and redistribute the material in any medium or format.
 *  - Adapt: remix, transform, and build upon the material.
 *
 * Under the following terms:
 *  - Attribution: You must give appropriate credit, provide a link to the license,
 *                 and indicate if changes where made.
 *  - NonCommerical: You may not use the material for commerical purposes.
 *  - No additional restrictions: You may not apply legal terms or technological 
 *                                measures that legally restrict others from doing
 *                                anything the license permits.
 */

// Define the grid size
const GRID_SIZE: u32 = 2048;

// Struct for representing 2D Projective Geometric Algebra (PGA) transformations
struct MultiVector {
  s: f32,
  e01: f32,
  eo0: f32,
  eo1: f32
};

// Camera pose structure
struct Pose {
  motor: MultiVector,
  scale: vec2f
};

// Geometric product for PGA transformations
fn geometricProduct(a: MultiVector, b: MultiVector) -> MultiVector {
  return MultiVector(
    a.s * b.s   - a.e01 * b.e01, // Scalar
    a.s * b.e01 + a.e01 * b.s,   // e01
    a.s * b.eo0 + a.e01 * b.eo1 + a.eo0 * b.s   - a.eo1 * b.e01, // eo0
    a.s * b.eo1 - a.e01 * b.eo0 + a.eo0 * b.e01 + a.eo1 * b.s    // eo1
  );
}

// Reverse operation for PGA
fn reverse(a: MultiVector) -> MultiVector {
  return MultiVector(a.s, -a.e01, -a.eo0, -a.eo1);
}

// Apply motor transformation to a multivector point
fn applyMotor(p: MultiVector, m: MultiVector) -> MultiVector {
  return geometricProduct(m, geometricProduct(p, reverse(m)));
}

// Transform a 2D point using PGA
fn applyMotorToPoint(p: vec2f, m: MultiVector) -> vec2f {
  let new_p = applyMotor(MultiVector(0, 1, p[0], p[1]), m);
  return vec2f(new_p.eo0 / new_p.e01, new_p.eo1 / new_p.e01);
}

// Camera pose and grid data
@group(0) @binding(0) var<uniform> cameraPose: Pose;
@group(0) @binding(1) var<storage> cellStateIn: array<u32>;
@group(0) @binding(2) var<storage, read_write> cellStateOut: array<u32>;

// Vertex output
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) cellState: f32
};

// Vertex shader
@vertex
fn vertexMain(@location(0) pos: vec2f, @builtin(instance_index) idx: u32) -> VertexOutput {
  let x = idx % GRID_SIZE;
  let y = idx / GRID_SIZE;
  let uv = vec2f(f32(x), f32(y)) / f32(GRID_SIZE);
  let halfLength = 1.0;
  let cellSize = halfLength * 2.0;

  // Compute position in the grid
  let cellOffset = -halfLength + uv * cellSize + cellSize / f32(GRID_SIZE) * 0.5;
  let transformed = applyMotorToPoint(pos / f32(GRID_SIZE) + cellOffset, reverse(cameraPose.motor));
  let scaled = transformed * cameraPose.scale;

  var output: VertexOutput;
  output.position = vec4f(scaled, 0, 1);
  output.cellState = f32(cellStateIn[idx]);
  return output;
}

// Fragment shader - Assigns color based on cell state
@fragment
fn fragmentMain(@location(0) cellState: f32) -> @location(0) vec4f {
  if (cellState == 0) { 
    return vec4f(0.1, 0.1, 0.1, 1); // Dead (Dark gray)
  } else if (cellState == 1) { 
    return vec4f(0.9, 0.2, 0.3, 1); // Alive (Red-pink)
  } else if (cellState == 2) { 
    return vec4f(0.0, 1.0, 0.5, 1); // Always alive (Green)
  } else if (cellState == 3) { 
    return vec4f(0.5, 0.5, 0.5, 1); // Permanently dead (Gray)
  } else { 
    return vec4f(0.0, 0.0, 0.0, 1); // Default (Black)
  }
}

// Compute shader to update cell states
@compute
@workgroup_size(8, 8)
fn computeMain(@builtin(global_invocation_id) cell: vec3u) {
  let x = cell.x;
  let y = cell.y;

  let i = y * GRID_SIZE + x;
  if (i >= GRID_SIZE * GRID_SIZE) { return; }

  // Count live neighbors
  let aliveNeighbors = 
    cellStateIn[(y - 1) * GRID_SIZE + (x)] +  
    cellStateIn[(y + 1) * GRID_SIZE + (x)] +  
    cellStateIn[(y) * GRID_SIZE + (x + 1)] +  
    cellStateIn[(y) * GRID_SIZE + (x - 1)] +  
    cellStateIn[(y - 1) * GRID_SIZE + (x + 1)] +  
    cellStateIn[(y - 1) * GRID_SIZE + (x - 1)] + 
    cellStateIn[(y + 1) * GRID_SIZE + (x + 1)] +  
    cellStateIn[(y + 1) * GRID_SIZE + (x - 1)];

  // Apply Conway’s Game of Life rules
  if (cellStateIn[i] >= 2) {
    cellStateOut[i] = cellStateIn[i]; // Preserve special states
  } else {
    if (aliveNeighbors < 2 || aliveNeighbors > 3) { 
      cellStateOut[i] = 0; // Underpopulation or Overpopulation
    } else if (aliveNeighbors == 3) { 
      cellStateOut[i] = 1; // Birth
    } else { 
      cellStateOut[i] = cellStateIn[i]; // Survival
    }
  }
}

// Alternate rule set
@compute
@workgroup_size(8, 8)
fn computeAlternativeRule(@builtin(global_invocation_id) cell: vec3u) {
  let x = cell.x;
  let y = cell.y;

  let i = y * GRID_SIZE + x;
  if (i >= GRID_SIZE * GRID_SIZE) { return; }

  // Count neighbors
  let aliveNeighbors = 
    cellStateIn[(y - 1) * GRID_SIZE + (x)] +  
    cellStateIn[(y + 1) * GRID_SIZE + (x)] +  
    cellStateIn[(y) * GRID_SIZE + (x + 1)] +  
    cellStateIn[(y) * GRID_SIZE + (x - 1)] +  
    cellStateIn[(y - 1) * GRID_SIZE + (x + 1)] +  
    cellStateIn[(y - 1) * GRID_SIZE + (x - 1)] + 
    cellStateIn[(y + 1) * GRID_SIZE + (x + 1)] +  
    cellStateIn[(y + 1) * GRID_SIZE + (x - 1)];

  // Custom variation
  if (cellStateIn[i] >= 2) {
    cellStateOut[i] = cellStateIn[i];
  } else if (aliveNeighbors == 8) { 
    cellStateOut[i] = 2; // Special case: Full isolation becomes permanently alive
  } else {
    if (aliveNeighbors < 2 || aliveNeighbors > 3) { 
      cellStateOut[i] = 0; 
    } else if (aliveNeighbors == 3) { 
      cellStateOut[i] = 1; 
    } else { 
      cellStateOut[i] = cellStateIn[i];
    }
  }
}
