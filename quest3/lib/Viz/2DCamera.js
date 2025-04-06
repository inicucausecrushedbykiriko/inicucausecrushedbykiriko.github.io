/*!
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
 
import PGA2D from '/quest3/lib/Math/PGA2D.js';

export default class Camera {
  constructor() {
    this._pose = new Float32Array([1, 0, 0, 0, 1, 1]);
    this._left = -1;
    this._right = 1;
    this._top = 1;
    this._bottom = -1;
  }

  resetPose() {
    this._pose.set([1, 0, 0, 0, 1, 1]);
    this._left = -1;
    this._right = 1;
    this._top = 1;
    this._bottom = -1;
  }

  updatePose(newpose) {
    this._pose[0] = newpose[0];
    this._pose[1] = newpose[1];
    this._pose[2] = newpose[2];
    this._pose[3] = newpose[3];
  }

  moveLeft(d) {
    if (this._left - d >= -1) {
      const dt = PGA2D.createTranslator(-d, 0);
      const newpose = PGA2D.normaliozeMotor(PGA2D.geometricProduct(dt, this._pose.slice(0, 4)));
      this.updatePose(newpose);
      this._left -= d;
      this._right -= d;
    }
  }

  moveRight(d) {
    if (this._right + d <= 1) {
      const dt = PGA2D.createTranslator(d, 0);
      const newpose = PGA2D.normaliozeMotor(PGA2D.geometricProduct(dt, this._pose.slice(0, 4)));
      this.updatePose(newpose);
      this._left += d;
      this._right += d;
    }
  }

  moveUp(d) {
    if (this._top + d <= 1) {
      const dt = PGA2D.createTranslator(0, d);
      const newpose = PGA2D.normaliozeMotor(PGA2D.geometricProduct(dt, this._pose.slice(0, 4)));
      this.updatePose(newpose);
      this._top += d;
      this._bottom += d;
    }
  }

  moveDown(d) {
    if (this._bottom - d >= -1) {
      const dt = PGA2D.createTranslator(0, -d);
      const newpose = PGA2D.normaliozeMotor(PGA2D.geometricProduct(dt, this._pose.slice(0, 4)));
      this.updatePose(newpose);
      this._top -= d;
      this._bottom -= d;
    }
  }

  zoomIn() {
    this._pose[4] *= 1.1;
    this._pose[5] *= 1.1;

    const zoomFactor = 1 / 1.1;
    this._left *= zoomFactor;
    this._right *= zoomFactor;
    this._top *= zoomFactor;
    this._bottom *= zoomFactor;
  }

  zoomOut() {
    const zoomFactor = 1.1;

    const newLeft = this._left * zoomFactor;
    const newRight = this._right * zoomFactor;
    const newTop = this._top * zoomFactor;
    const newBottom = this._bottom * zoomFactor;

    // Check if zoom-out keeps simulation area inside bounds
    if (newLeft >= -1 && newRight <= 1 && newTop <= 1 && newBottom >= -1) {
      this._pose[4] /= zoomFactor;
      this._pose[5] /= zoomFactor;

      this._left = newLeft;
      this._right = newRight;
      this._top = newTop;
      this._bottom = newBottom;
    } else {
      // Intelligent adjust: recenter toward origin if edge reached
      const adjustX = (Math.abs(newLeft) > 1 || Math.abs(newRight) > 1);
      const adjustY = (Math.abs(newTop) > 1 || Math.abs(newBottom) > 1);

      if (adjustX || adjustY) {
        const moveX = (this._left + this._right) / 2;
        const moveY = (this._top + this._bottom) / 2;

        const tx = Math.max(-moveX, Math.min(-moveX, 0));
        const ty = Math.max(-moveY, Math.min(-moveY, 0));

        const dt = PGA2D.createTranslator(tx, ty);
        const newpose = PGA2D.normaliozeMotor(PGA2D.geometricProduct(dt, this._pose.slice(0, 4)));
        this.updatePose(newpose);

        this._left += tx;
        this._right += tx;
        this._top += ty;
        this._bottom += ty;
      }

      // Try zooming out again after adjust
      this.zoomOut();
    }
  }
}
