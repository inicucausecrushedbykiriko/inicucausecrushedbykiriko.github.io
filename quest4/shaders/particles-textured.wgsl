/* 
 * particles-textured.wgsl
 *
 * We do triangle-list for each particle, storing a small quad with (x,y,u,v).
 * We'll get the per-instance (x,y,ix,iy,vx,vy,age,life) from "particlesIn"
 * in the vertex stage. The compute stage updates them each frame.
 *
 * Key changes:
 *  - No wind (just gravity, center, mouse).
 *  - Slower velocities.
 *  - In the fragment, we sample a radial gradient texture for glow.
 *  - Color changes with age => fireworks-like effect.
 */

@group(0) @binding(0)
var<storage, read> particlesIn : array<vec4f>;   // read-only

@group(0) @binding(1)
var<storage, read_write> particlesOut : array<vec4f>; // compute-only

@group(0) @binding(2)
var<uniform> param : vec4f; 
// param.x = gravityScale
// param.y = mouseX
// param.z = mouseY
// param.w = mouseActive

@group(0) @binding(3)
var tex : texture_2d<f32>;

@group(0) @binding(4)
var texSampler : sampler;

/* ---------------------------------------------------------------------------
   Compute Shader
   -------------------------------------------------------------------------*/
@compute @workgroup_size(256)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
    let idx = global_id.x;
    let arrCount = arrayLength(&particlesIn);
    let baseIdx = idx * 2u;
    if (baseIdx + 1u >= arrCount) {
        return;
    }

    // param.x = gravityScale
    // param.y = mouseX
    // param.z = mouseY
    // param.w = mouseActive
    let gravityScale = param.x;
    let mouseX       = param.y;
    let mouseY       = param.z;
    let mouseActive  = param.w;

    // particle data
    let px  = particlesIn[baseIdx + 0u].x;
    let py  = particlesIn[baseIdx + 0u].y;
    let ix  = particlesIn[baseIdx + 0u].z;
    let iy  = particlesIn[baseIdx + 0u].w;

    let vx  = particlesIn[baseIdx + 1u].x;
    let vy  = particlesIn[baseIdx + 1u].y;
    let age = particlesIn[baseIdx + 1u].z;
    let life= particlesIn[baseIdx + 1u].w;

    // 1) gravity
    let baseGravity = 0.00007;
    var newVy = vy - baseGravity * gravityScale;
    var newVx = vx;

    // 2) center attraction
    let cx = -px;
    let cy = -py;
    let distC = sqrt(cx*cx + cy*cy);
    if (distC > 0.00001) {
      let pullCenter = 0.00001;
      newVx += pullCenter * (cx / distC);
      newVy += pullCenter * (cy / distC);
    }

    // 3) mouse attraction (only if param.w>0.5)
    if (mouseActive > 0.5) {
      let mx = mouseX - px;
      let my = mouseY - py;
      let distM = sqrt(mx*mx + my*my);
      if (distM > 0.00001) {
        let pullMouse = 0.0005;
        newVx += pullMouse * (mx / distM);
        newVy += pullMouse * (my / distM);
      }
    }

    // 4) update position
    let new_x = px + newVx;
    let new_y = py + newVy;

    // 5) circular boundary wrap
    var wrappedX = new_x;
    var wrappedY = new_y;
    if (new_x >  1.0) { wrappedX = -1.0; }
    if (new_x < -1.0) { wrappedX =  1.0; }
    if (new_y >  1.0) { wrappedY = -1.0; }
    if (new_y < -1.0) { wrappedY =  1.0; }

    // 6) age
    var newAge = age + 1.0;
    if (newAge > life) {
      // respawn
      let rx = (sin(py * 43758.5453) - 0.5) * 0.003;
      let ry = (sin(px * 43758.5453) - 0.5) * 0.003;
      let newLife = floor((sin(px * 9999.7) * 0.5 + 0.5) * 240.0 + 60.0);

      particlesOut[baseIdx + 0u] = vec4f(ix, iy, ix, iy);
      particlesOut[baseIdx + 1u] = vec4f(rx, ry, 0.0, newLife);
    }
    else {
      // normal
      particlesOut[baseIdx + 0u] = vec4f(wrappedX, wrappedY, ix, iy);
      particlesOut[baseIdx + 1u] = vec4f(newVx, newVy, newAge, life);
    }
}

/* ---------------------------------------------------------------------------
   Vertex Shader
   We'll get the per-instance data from particlesIn. Then:
   - scale the quad to something small
   - position at (px,py)
   - color shift in the vs->fs
   We'll pass age ratio to the fragment for color interpolation
   -------------------------------------------------------------------------*/
struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,       // uv for sampling
  @location(1) ratio: f32,      // age ratio
};

@vertex
fn vertexMain(
  @location(0) localPos : vec2f, // from quad buffer
  @location(1) localUV  : vec2f, // from quad buffer
  @builtin(instance_index) instanceId : u32
) -> VSOut {
    let arrCount = arrayLength(&particlesIn);
    let baseIdx  = instanceId * 2u;

    var out : VSOut;
    if (baseIdx + 1u >= arrCount) {
      out.pos = vec4f(0.0, 0.0, 0.0, 1.0);
      out.uv = localUV;
      out.ratio = 0.0;
      return out;
    }

    let px = particlesIn[baseIdx + 0u].x;
    let py = particlesIn[baseIdx + 0u].y;
    let vx = particlesIn[baseIdx + 1u].x; // might be used for color
    let vy = particlesIn[baseIdx + 1u].y;
    let age= particlesIn[baseIdx + 1u].z;
    let life=particlesIn[baseIdx + 1u].w;

    // We compute age ratio => 0..1
    let ratio = clamp(age / life, 0.0, 1.0);

    // scale each quad => 0.02 ( you can tweak smaller for slower effect )
    // plus we can do a sub-scale for older age => e.g. fade out at end
    let scale = 0.02 * (1.0 - ratio);

    let worldX = px + localPos.x * scale;
    let worldY = py + localPos.y * scale;

    out.pos = vec4f(worldX * 1.0, worldY * 1.0, 0.0, 1.0);
    out.uv  = localUV;
    out.ratio = ratio;
    return out;
}

/* ---------------------------------------------------------------------------
   Fragment Shader
   We sample the radial gradient texture => radial glow
   Then we color shift from white => color => black or something
   We'll do a simple gradient: ratio=0 => bluish, ratio=1 => redish
   Then we multiply by the texture alpha => additive blending => glow
   -------------------------------------------------------------------------*/
@fragment
fn fragmentMain(in : VSOut) -> @location(0) vec4f {
  let tCol = textureSample(tex, texSampler, in.uv);

  // color shift from bluish => purple => pink => red => etc
  let c0 = vec3f(0.2, 0.4, 1.0); // bluish
  let c1 = vec3f(1.0, 0.1, 0.2); // pink/red

  let ratio = clamp(in.ratio, 0.0, 1.0);
  let baseColor = mix(c0, c1, ratio);
  let alpha = tCol.a; // from radial gradient
  // If you want it more intense, you can do alpha= alpha^someExponent

  return vec4f(baseColor, alpha);
}