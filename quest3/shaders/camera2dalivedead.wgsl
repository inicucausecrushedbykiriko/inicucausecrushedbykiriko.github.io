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

// camera2dalivedead.wgsl
//
// This WGSL shader file has been updated to ensure proper alignment
// for uniform buffers and to utilize the modern attribute syntax (@group, @binding).
// The shader includes a compute shader for updating a 2048×2048 Game of Life grid
// and vertex/fragment shaders for rendering the grid as line strips.

// -----------------------------------------------------------------------------
// Struct Definitions
// -----------------------------------------------------------------------------

// Struct to store a multi-vector (motor) for 2D transformations
struct MultiVector {
    s: f32,
    e01: f32,
    eo0: f32,
    eo1: f32,
};

// Struct to store 2D Camera pose
struct Pose {
    motor: MultiVector,
    scale: vec2<f32>,
};

// -----------------------------------------------------------------------------
// Function Definitions
// -----------------------------------------------------------------------------

// Function to compute the geometric product of two multi-vectors
fn geometricProduct(a: MultiVector, b: MultiVector) -> MultiVector {
    // Reference: https://geometricalgebratutorial.com/pga/
    return MultiVector(
        a.s * b.s   - a.e01 * b.e01, // scalar
        a.s * b.e01 + a.e01 * b.s,   // e01
        a.s * b.eo0 + a.e01 * b.eo1 + a.eo0 * b.s   - a.eo1 * b.e01, // eo0
        a.s * b.eo1 - a.e01 * b.eo0 + a.eo0 * b.e01 + a.eo1 * b.s    // eo1
    );
}

// Function to compute the reverse of a multi-vector
fn reverse(a: MultiVector) -> MultiVector {
    return MultiVector(a.s, -a.e01, -a.eo0, -a.eo1);
}

// Function to apply a motor (transformation) to a point
fn applyMotorToPoint(p: vec2<f32>, m: MultiVector) -> vec2<f32> {
    // Reference: https://geometricalgebratutorial.com/pga/
    // Three basic vectors e0, e1, and eo (origin)
    // Three basic bi-vectors e01, eo0, eo1
    // p = 0 + 1*e01 - x*eo1 + y*eo0
    // m = c + s*e01 + dx/2*eo0 - dy/2*eo1
    let new_p = geometricProduct(m, geometricProduct(MultiVector(0.0, 1.0, p.x, p.y), reverse(m)));
    return vec2<f32>(new_p.eo0 / new_p.e01, new_p.eo1 / new_p.e01);
}

// -----------------------------------------------------------------------------
// Shader Bindings
// -----------------------------------------------------------------------------

@group(0) @binding(0) var<uniform> camerapose: Pose;
@group(0) @binding(1) var<storage> cellStatusIn: array<u32>;
@group(0) @binding(2) var<storage, read_write> cellStatusOut: array<u32>;

// -----------------------------------------------------------------------------
// Vertex Shader
// -----------------------------------------------------------------------------

struct VertexOutput {
    @builtin(position) pos: vec4<f32>,
    @location(0) cellStatus: f32, // Pass the cell status
};

@vertex
fn vertexMain(@location(0) pos: vec2<f32>, @builtin(instance_index) idx: u32) -> VertexOutput {
    let u = idx % 2048u; // X index
    let v = idx / 2048u; // Y index
    let uv = vec2<f32>(f32(u), f32(v)) / 2048.0; // Normalize coordinates to [0, 1]
    let halfLength = 1.0; // Half cell length
    let cellLength = halfLength * 2.0; // Full cell length
    let cell = pos / 2048.0; // Divide the input quad into 2048x2048 pieces
    let offset = -halfLength + uv * cellLength + cellLength / 2048.0 * 0.5; // Compute the offset for the instance
    // Apply motor
    let transformed = applyMotorToPoint(cell + offset, reverse(camerapose.motor));
    // Apply scale
    let scaled = transformed * camerapose.scale;
    var out: VertexOutput;
    out.pos = vec4<f32>(scaled, 0.0, 1.0);
    out.cellStatus = f32(cellStatusIn[idx]);
    return out;
}

// -----------------------------------------------------------------------------
// Fragment Shader
// -----------------------------------------------------------------------------

@fragment
fn fragmentMain(@location(0) cellStatus: f32) -> @location(0) vec4<f32> {
    return vec4<f32>(28.0 / 255.0, 161.0 / 255.0, 82.0 / 255.0, 1.0) * cellStatus; // (R, G, B, A)
}

// -----------------------------------------------------------------------------
// Compute Shader
// -----------------------------------------------------------------------------

@compute @workgroup_size(4, 4)
fn computeMain(@builtin(global_invocation_id) cell: vec3<u32>) {
    let x = cell.x;
    let y = cell.y;
    let width = 2048u;
    let height = 2048u;

    // Ensure indices are within bounds
    if (x >= width || y >= height) {
        return;
    }

    // Compute linear index
    let i = y * width + x;

    // Count how many neighbors are alive
    var neighborsAlive = 0u;
    for (var dy = -1; dy <= 1; dy = dy + 1) {
        for (var dx = -1; dx <= 1; dx = dx + 1) {
            if (dx == 0 && dy == 0) {
                continue; // Skip the current cell
            }
            let nx = i32(x) + dx;
            let ny = i32(y) + dy;
            if (nx >= 0 && ny >= 0 && u32(nx) < width && u32(ny) < height) {
                let neighborIndex = u32(ny) * width + u32(nx);
                neighborsAlive += cellStatusIn[neighborIndex];
            }
        }
    }

    // Compute new status
    if (cellStatusIn[i] == 1u) {
        if (neighborsAlive < 2u || neighborsAlive > 3u) {
            cellStatusOut[i] = 0u;
        } else {
            cellStatusOut[i] = 1u;
        }
    } else {
        if (neighborsAlive == 3u) {
            cellStatusOut[i] = 1u;
        } else {
            cellStatusOut[i] = 0u;
        }
    }
}
