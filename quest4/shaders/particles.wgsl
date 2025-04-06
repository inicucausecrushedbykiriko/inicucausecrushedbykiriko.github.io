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

/* 
 * particles.wgsl
 *
 * Each particle occupies 2 vec4 slots:
 *   index 0 => (x, y, ix, iy)
 *   index 1 => (vx, vy, age, life)
 *
 * We'll apply:
 *  - Gravity scaled by param.gravityScale
 *  - Very small wind => sin-based
 *  - Center attraction (reduced)
 *  - Circular boundary wrap
 *  - Lifespan => if age>life => respawn
 *  - Mouse attraction => now very strong
 *
 * param buffer:
 *   param.x = gravityScale
 *   param.y = mouseX
 *   param.z = mouseY
 *   param.w = mouseActive
 */

@group(0) @binding(0)
var<storage, read> particlesIn : array<vec4f>;   

@group(0) @binding(1)
var<storage, read_write> particlesOut : array<vec4f>; 

@group(0) @binding(2)
var<uniform> param : vec4f; 
// param.x = gravityScale
// param.y = mouseX
// param.z = mouseY
// param.w = mouseActive

//////////////////////
// Vertex Shader
//////////////////////
@vertex
fn vertexMain(
  @builtin(instance_index) instanceIdx : u32,
  @builtin(vertex_index)   vertexIdx   : u32
) -> @builtin(position) vec4f {
    let arrCount = arrayLength(&particlesIn);
    let baseIdx  = instanceIdx * 2u;

    if (baseIdx + 1u >= arrCount) {
        return vec4f(0.0, 0.0, 0.0, 1.0);
    }

    let px = particlesIn[baseIdx + 0u].x;
    let py = particlesIn[baseIdx + 0u].y;

    // We'll draw a circle with 8 segments, radius ~0.0065
    let steps = 8.0;
    let pi    = 3.1415926535;
    let angle = (2.0 * pi / steps) * f32(vertexIdx);
    let r     = 0.0065;

    let cx = px + cos(angle) * r;
    let cy = py + sin(angle) * r;
    return vec4f(cx, cy, 0.0, 1.0);
}

//////////////////////
// Fragment Shader
//////////////////////
@fragment
fn fragmentMain() -> @location(0) vec4f {
    return vec4f(238.0/255.0, 118.0/255.0, 35.0/255.0, 1.0);
}

//////////////////////
// Compute Shader
//////////////////////
@compute @workgroup_size(256)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
    let idx = global_id.x;
    let arrCount = arrayLength(&particlesIn);
    let baseIdx = idx * 2u;
    if (baseIdx + 1u >= arrCount) {
        return;
    }

    let gravityScale = param.x; // param.x
    let mouseX       = param.y; // param.y
    let mouseY       = param.z; // param.z
    let mouseActive  = param.w; // param.w

    // Particle data
    let old_x   = particlesIn[baseIdx + 0u].x;
    let old_y   = particlesIn[baseIdx + 0u].y;
    let init_x  = particlesIn[baseIdx + 0u].z;
    let init_y  = particlesIn[baseIdx + 0u].w;

    let old_vx  = particlesIn[baseIdx + 1u].x;
    let old_vy  = particlesIn[baseIdx + 1u].y;
    let old_age = particlesIn[baseIdx + 1u].z;
    let life    = particlesIn[baseIdx + 1u].w;

    var vx = old_vx;
    var vy = old_vy;

    //--------------------
    // 1) Gravity (scaled)
    //--------------------
    let baseGravity = 0.00007;
    vy -= baseGravity * gravityScale;

    //--------------------
    // 2) Very small wind
    //--------------------
    let windStrength = 0.000000000001; // still quite small
    let wind = sin(old_y * 15.0) * windStrength;
    vx += wind;

    //--------------------
    // 3) Center attraction
    //--------------------
    let cx = 0.0 - old_x;
    let cy = 0.0 - old_y;
    let distToCenter = sqrt(cx*cx + cy*cy);
    if (distToCenter > 0.00001) {
       let pullCenter = 0.00001; // lowered further => less overshadow
       vx += pullCenter * (cx / distToCenter);
       vy += pullCenter * (cy / distToCenter);
    }

    //--------------------
    // 4) Mouse attraction
    //--------------------
    if (mouseActive > 0.5) {
      let mx = mouseX - old_x;
      let my = mouseY - old_y;
      let distM = sqrt(mx*mx + my*my);
      if (distM > 0.00001) {
        let pullMouse = 0.0005; // big => overshadow other forces
        vx += pullMouse * (mx / distM);
        vy += pullMouse * (my / distM);
      }
    }

    // 5) Update position
    let new_x = old_x + vx;
    let new_y = old_y + vy;

    // 6) Circular boundary wrap
    var wrapped_x = new_x;
    var wrapped_y = new_y;
    if (new_x >  1.0) { wrapped_x = -1.0; }
    if (new_x < -1.0) { wrapped_x =  1.0; }
    if (new_y >  1.0) { wrapped_y = -1.0; }
    if (new_y < -1.0) { wrapped_y =  1.0; }

    // 7) Age + lifespan check
    var age = old_age + 1.0;
    if (age > life) {
      // Respawn at (init_x, init_y) + random velocity
      let rx = (sin(old_y * 43758.5453) - 0.5) * 0.01;
      let ry = (sin(old_x * 43758.5453) - 0.5) * 0.01;
      let newLife = floor((sin(old_x * 9999.7) * 0.5 + 0.5) * 240.0 + 60.0);

      particlesOut[baseIdx + 0u] = vec4f(init_x, init_y, init_x, init_y);
      particlesOut[baseIdx + 1u] = vec4f(rx, ry, 0.0, newLife);
    }
    else {
      // normal update
      particlesOut[baseIdx + 0u] = vec4f(wrapped_x, wrapped_y, init_x, init_y);
      particlesOut[baseIdx + 1u] = vec4f(vx, vy, age, life);
    }
}
