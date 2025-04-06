/* particles-fireAndSmoke.wgsl
 *
 * We store each particle in 2 vec4:
 *   index 0 => (x, y, ix, iy)
 *   index 1 => (vx, vy, age, life)
 *
 * If life < 0 => "smoke," else => "colored spark."
 *
 * No wind. Only gravity, center, optional mouse attract, boundary wrap.
 * Non-linear interpolation: ratio^2 or ratio^1.5 for fade.
 * Large real-time system (20k).
 */

@group(0) @binding(0)
var<storage, read> particlesIn : array<vec4f>;

@group(0) @binding(1)
var<storage, read_write> particlesOut : array<vec4f>;

@group(0) @binding(2)
var<uniform> param : vec4f; 
// param.x => gravityScale
// param.y => mouseX
// param.z => mouseY
// param.w => mouseActive

@group(0) @binding(3)
var tex : texture_2d<f32>;

@group(0) @binding(4)
var texSampler : sampler;

/* ---------------------------------------------------------------------------
   Compute Shader
   (No wind, just gravity, center attraction, mouse attract, boundary wrap)
---------------------------------------------------------------------------*/
@compute @workgroup_size(256)
fn computeMain(@builtin(global_invocation_id) gid : vec3u) {
  let idx = gid.x;
  let total = arrayLength(&particlesIn);
  let base = idx * 2u;
  if (base + 1u >= total) {
    return;
  }

  let gravityScale = param.x;
  let mouseX = param.y;
  let mouseY = param.z;
  let mouseActive = param.w;

  // The first vec4 => (x,y, ix,iy)
  let old_x = particlesIn[base+0u].x;
  let old_y = particlesIn[base+0u].y;
  let ix    = particlesIn[base+0u].z;
  let iy    = particlesIn[base+0u].w;

  // The second vec4 => (vx, vy, age, life)
  let old_vx   = particlesIn[base+1u].x;
  let old_vy   = particlesIn[base+1u].y;
  let old_age  = particlesIn[base+1u].z;
  let old_life = particlesIn[base+1u].w;

  // Because some life is negative => "smoke"
  let absLife = abs(old_life);

  var vx = old_vx;
  var vy = old_vy;

  // gravity
  let baseGrav = 0.00007;
  vy -= baseGrav * gravityScale;

  // center
  let cx = -old_x;
  let cy = -old_y;
  let distC = sqrt(cx*cx + cy*cy);
  if (distC > 0.00001) {
    let pullCenter = 0.00001;
    vx += pullCenter * (cx / distC);
    vy += pullCenter * (cy / distC);
  }

  // mouse attract
  if (mouseActive > 0.5) {
    let mx = mouseX - old_x;
    let my = mouseY - old_y;
    let distM= sqrt(mx*mx + my*my);
    if (distM > 0.00001) {
      let pullMouse = 0.0005;
      vx += pullMouse*(mx/distM);
      vy += pullMouse*(my/distM);
    }
  }

  // move
  let new_x = old_x + vx;
  let new_y = old_y + vy;

  // wrap
  var wrapped_x= new_x;
  var wrapped_y= new_y;
  if (new_x>1.0) { wrapped_x = -1.0; }
  if (new_x<-1.0){ wrapped_x =  1.0; }
  if (new_y>1.0) { wrapped_y = -1.0; }
  if (new_y<-1.0){ wrapped_y =  1.0; }

  // age
  let new_age = old_age + 1.0;
  if (new_age > absLife) {
    // re-spawn
    var newLifeSign = 1.0;        // MUST be "var" to reassign
    if (old_life < 0.0) {
      newLifeSign = -1.0;
    }
    let rx= (sin(old_y*43758.5453)-0.5)*0.003;
    let ry= (sin(old_x*43758.5453)-0.5)*0.003;
    let lifeVal= floor((sin(old_x*9999.7)*0.5+0.5)*240. + 60.);

    particlesOut[base+0u] = vec4f(ix, iy, ix, iy);
    particlesOut[base+1u] = vec4f(rx, ry, 0.0, newLifeSign * lifeVal);
  } else {
    particlesOut[base+0u] = vec4f(wrapped_x, wrapped_y, ix, iy);
    particlesOut[base+1u] = vec4f(vx, vy, new_age, old_life);
  }
}

/* ---------------------------------------------------------------------------
   Vertex Shader
   We'll do a non-linear fade => ratio^2 for scale.
---------------------------------------------------------------------------*/
struct VSOut {
  @builtin(position) pos : vec4f,
  @location(0) uv : vec2f,
  @location(1) ratio : f32,   // for color/alpha fade
  @location(2) isSmoke : f32, // if life<0 => 1 else => 0
};

@vertex
fn vertexMain(
  @location(0) localPos : vec2f, 
  @location(1) localUV  : vec2f,
  @builtin(instance_index) instId : u32
) -> VSOut {
  let total= arrayLength(&particlesIn);
  let base= instId * 2u;

  var out: VSOut;
  if (base+1u>= total) {
    out.pos= vec4f(0.0,0.0,0.0,1.0);
    out.uv= localUV;
    out.ratio= 0.0;
    out.isSmoke= 0.0;
    return out;
  }

  let px= particlesIn[base+0u].x;
  let py= particlesIn[base+0u].y;
  let age= particlesIn[base+1u].z;
  let lf= particlesIn[base+1u].w; // negative => smoke
  let absLife= abs(lf);

  let linear= clamp(age/absLife, 0.0,1.0);
  let ratio= linear*linear; // ratio^2 => non-linear

  var style= 0.0;
  if (lf<0.0) {
    style=1.0; // smoke
  }
  
  // scale => 0.02*(1 - ratio)
  let baseScale= 0.02*(1.0 - ratio);
  let wposx= px + localPos.x* baseScale;
  let wposy= py + localPos.y* baseScale;

  out.pos= vec4f(wposx, wposy, 0.0, 1.0);
  out.uv= localUV;
  out.ratio= ratio;
  out.isSmoke= style;
  return out;
}

/* ---------------------------------------------------------------------------
   Fragment
   We sample radial texture => alpha circle.
   If isSmoke => grey color, else => sparks color.
   Then apply alpha fade => alpha= textureAlpha*(1-ratio^1.5) for a smooth fade.
---------------------------------------------------------------------------*/
@fragment
fn fragmentMain(in : VSOut) -> @location(0) vec4f {
  let texColor= textureSample(tex, texSampler, in.uv);

  let a= texColor.a; // radial alpha
  let alphaFade= (1.0 - pow(in.ratio,1.5)); 
  let finalAlpha= a* alphaFade;

  if (in.isSmoke>0.5) {
    // smoke => grey
    let col= vec3f(0.6,0.6,0.6);
    return vec4f(col, finalAlpha);
  } else {
    // spark => from (1,1,0) => (1,0,0)
    let c0= vec3f(1.0,1.0,0.0);
    let c1= vec3f(1.0,0.0,0.0);
    let col= mix(c0,c1, in.ratio);
    return vec4f(col, finalAlpha);
  }
}
