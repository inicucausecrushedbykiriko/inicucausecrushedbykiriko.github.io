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

@group(0) @binding(0)
var<storage, read> particlesIn : array<vec4f>;        // read-only

@group(0) @binding(1)
var<storage, read_write> particlesOut : array<vec4f>; // compute-only

//
// Vertex Shader
// Draws each particle as a small circle using line-strip
//
@vertex
fn vertexMain(
    @builtin(instance_index) instanceIdx: u32,
    @builtin(vertex_index)   vertexIdx:   u32
) -> @builtin(position) vec4f {
    let arrCount = arrayLength(&particlesIn);
    let baseIdx  = instanceIdx * 2u;
    // If out-of-range, skip
    if (baseIdx + 1u >= arrCount) {
        return vec4f(0.0, 0.0, 0.0, 1.0);
    }

    // Unpack the data
    let px = particlesIn[baseIdx].x; // current X
    let py = particlesIn[baseIdx].y; // current Y
    // let ix = particlesIn[baseIdx].z; // initial X
    // let iy = particlesIn[baseIdx].w; // initial Y
    // let vx = particlesIn[baseIdx + 1u].x; // velocity X
    // let vy = particlesIn[baseIdx + 1u].y; // velocity Y

    // We'll draw a circle with 8 segments, radius ~0.0125
    let steps = 8.0;
    let pi    = 3.1415926535;
    let angle = (2.0 * pi / steps) * f32(vertexIdx);
    let r     = 0.0125;

    let cx = px + cos(angle) * r;
    let cy = py + sin(angle) * r;

    return vec4f(cx, cy, 0.0, 1.0);
}

//
// Fragment Shader
// Simple constant color (e.g. an orange-ish)
@fragment
fn fragmentMain() -> @location(0) vec4f {
    return vec4f(238.0/255.0, 118.0/255.0, 35.0/255.0, 1.0);
}

//
// Compute Shader
// Updates the particles each frame: x += vx, boundary checking, etc.
//
@compute @workgroup_size(256)
fn computeMain(@builtin(global_invocation_id) global_id : vec3u) {
    let idx = global_id.x;
    let arrCount = arrayLength(&particlesIn);
    let baseIdx  = idx * 2u;
    // Out of range?
    if (baseIdx + 1u >= arrCount) {
        return;
    }

    // Unpack old data
    let old_x   = particlesIn[baseIdx + 0u].x;
    let old_y   = particlesIn[baseIdx + 0u].y;
    let init_x  = particlesIn[baseIdx + 0u].z;
    let init_y  = particlesIn[baseIdx + 0u].w;

    let vel_x   = particlesIn[baseIdx + 1u].x;
    let vel_y   = particlesIn[baseIdx + 1u].y;

    // Move
    let new_x = old_x + vel_x;
    let new_y = old_y + vel_y;

    var new_vel_x = vel_x;
    var new_vel_y = vel_y;

    // Optional simple gravity
    // new_vel_y -= 0.0001;

    // Boundary check => if outside [-1,1], respawn
    if (new_x < -1.0 || new_x > 1.0 || new_y < -1.0 || new_y > 1.0) {
        // reset to init, random new velocity
        let rx = (sin(old_y * 43758.5453) - 0.5) * 0.01;
        let ry = (sin(old_x * 43758.5453) - 0.5) * 0.01;
        particlesOut[baseIdx + 0u] = vec4f(init_x, init_y, init_x, init_y);
        particlesOut[baseIdx + 1u] = vec4f(rx, ry, 0.0, 0.0);
    } else {
        // normal case: just update
        particlesOut[baseIdx + 0u] = vec4f(new_x, new_y, init_x, init_y);
        particlesOut[baseIdx + 1u] = vec4f(new_vel_x, new_vel_y, 0.0, 0.0);
    }
}