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

struct Particle {
  p: vec2f,   // the particle position
  v: vec2f,   // the particle velocity
  dv: vec2f,  // the velocity update
  m: f32,     // the partilce pass
  dummy: f32, // a dummy value for memory alignment
}

struct Spring {
  pts: vec2f, // the indices of two connected partilces
  l: f32,     // the original spring length
  s: f32      // the stiffness coefficient
}

// TODO 4: bind the storage buffer variables





@vertex
fn vertexMain(@builtin(instance_index) idx: u32, @builtin(vertex_index) vIdx: u32) -> @builtin(position) vec4f {
  // draw circles to represent a particle
  let particle = particlesIn[idx];
  let r = particle.m;
  let pi = 3.14159265;
  let theta = 2. * pi / 8 * f32(vIdx);
  let x = cos(theta) * r;
  let y = sin(theta) * r;
  return vec4f(vec2f(x + particle.p[0], y + particle.p[1]), 0, 1);
}

@fragment
fn fragmentMain() -> @location(0) vec4f {
  return vec4f(238.f/255, 118.f/255, 35.f/255, 1); // (R, G, B, A)
}

@vertex
fn vertexSpringMain(@builtin(instance_index) idx: u32, @builtin(vertex_index) vIdx: u32) -> @builtin(position) vec4f {
  //draw lines to present a spring - here is an ugly hack using an offset, which does not visualize nicely...
  // for better apperance, use texture mapping, by now, you should know how to use vertex_index/instance_index to draw the shapes you like in the vertex shader
  return vec4f(particlesIn[u32(springsIn[idx].pts[vIdx % 2])].p + 0.001 * f32(vIdx / 2), 0, 1);
}

@fragment
fn fragmentSpringMain() -> @location(0) vec4f {
  return vec4f(255.f/255, 163.f/255, 0.f/255, 1); // (R, G, B, A)
}

@compute @workgroup_size(256)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  
  if (idx < arrayLength(&springsIn)) {
    // Get the spring using the invocation id
    var spring = springsIn[idx];
    let aIdx = u32(spring.pts[0]); // particle a
    let bIdx = u32(spring.pts[1]); // particle b
    
    let ptA = particlesIn[aIdx].p; // position a
    let ptB = particlesIn[bIdx].p; // position b
    let massA = particlesIn[aIdx].m; // mass a
    let massB = particlesIn[bIdx].m; // mass b
    
    // TODO 5a: compute the spring force using Hooke's Law
    let diff = ptB - ptA;
    let dist = length(diff);
    let force = spring.s * (dist - spring.l);
    
    // TODO 5b: compute the delta velocity using Netwon's law of motion
    
    
  }
}

@compute @workgroup_size(256)
fn updateMain(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  
  if (idx < arrayLength(&particlesIn)) {
    var particle = particlesIn[idx];
    particlesOut[idx].p = particle.p + particle.v + particlesOut[idx].dv; // update the posistion
    particlesOut[idx].v = (particle.v + particlesOut[idx].dv) * 0.95;     // damping
    particlesOut[idx].dv = vec2f(0, 0);                                   // reset delta velocity to zeros
    particlesOut[idx].m = particle.m;                                     // copy the mass over
  }
}
