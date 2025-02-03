import Standard2DPGAPosedVertexColorObject from "/lib/DSViz/Standard2DPGAPosedVertexColorObject.js"
import PGA2D from "/lib/Math/PGA2D.js"

export default class SpaceshipObject extends Standard2DPGAPosedVertexColorObject {
  constructor(device, canvasFormat, initialPose) {
    const vertices = new Float32Array([
      // Main body (triangle)
      0, 0.2, 0.8, 0.8, 0.8, 1,    // Top vertex
      -0.15, -0.2, 0.5, 0.5, 0.8, 1, // Left base
      0.15, -0.2, 0.5, 0.5, 0.8, 1,  // Right base
      
      // Left wing
      -0.25, -0.1, 0.7, 0.2, 0.2, 1,
      -0.15, -0.2, 0.7, 0.2, 0.2, 1,
      -0.25, -0.3, 0.7, 0.2, 0.2, 1,
      
      // Right wing
      0.25, -0.1, 0.7, 0.2, 0.2, 1,
      0.15, -0.2, 0.7, 0.2, 0.2, 1,
      0.25, -0.3, 0.7, 0.2, 0.2, 1,
      
      // Thruster glow (animated in update)
      0, -0.4, 1, 0.4, 0, 0.8,
      -0.05, -0.45, 1, 0.4, 0, 0.8,
      0.05, -0.45, 1, 0.4, 0, 0.8,
    ]);

    super(device, canvasFormat, vertices, initialPose);
    
    // Animation parameters
    this._animationPhase = 0;
    this._thrusterIntensity = 1;
    this._step = 0.05;
    
    // Define two motion states
    this._hoverMotor1 = PGA2D.normalizeMotor([1, 0, 0, 0.1]);
    this._hoverMotor2 = PGA2D.normalizeMotor([1, 0, 0, -0.1]);
  }

  updateGeometry() {
    // Hover animation using motor interpolation
    const hoverFactor = (Math.sin(this._animationPhase) + 1) / 2;
    const currentHoverMotor = PGA2D.slerp(this._hoverMotor1, this._hoverMotor2, hoverFactor);
    
    // Combine with initial pose
    const combinedMotor = PGA2D.geometricProduct(currentHoverMotor, this._pose);
    this._pose.set(PGA2D.normalizeMotor(combinedMotor));
    
    // Thruster pulse animation
    this._thrusterIntensity = 0.8 + Math.abs(Math.sin(this._animationPhase * 2)) * 0.2;
    this.updateThrusterColor();
    
    this._animationPhase += this._step;
    super.updateGeometry();
  }

  updateThrusterColor() {
    const vertices = this._vertexBufferData;
    // Update alpha channel for thruster vertices (indices 9-11)
    for(let i = 9; i <= 11; i++) {
      const baseIndex = i * 6 + 5; // 6 elements per vertex, index 5 is alpha
      vertices[baseIndex] = this._thrusterIntensity;
    }
    this._vertexBufferNeedUpdate = true;
  }
}