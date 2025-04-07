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
 
import PolygonIO from "/lib/IO/PolygonIO.js"
import PGA2D from "/lib/Math/PGA2D.js"

export default class Polygon {
  // Note: Polygon consists only vertices where the first and the last are the same
  constructor(filename) {
    this._filename = filename;
  }
  
  centerOfMass() {
    let C = Array(this._dim).fill(0);
    for (let i = 0; i < this._numV - 1; ++i) {
      for (let j = 0; j < this._dim; ++j) {
        C[j] += this._polygon[i][j];
      }
    }
    for (let i = 0; i < this._dim; ++i) {
      C[i] /= this._numV;
    }
    return C;
  }
  
  surfaceArea() {
    // Heron’s formula
    const l = (a, b) => Math.sqrt(Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2) + Math.pow(b[2] - a[2], 2));
    const area = (e0, e1, e2, s) => Math.sqrt(s * (s - e0) * (s - e1) * (s - e2));
    let A = 0;
    var v0 = [...this.centerOfMass()];
    if (v0.length == 2) v0.push(0);
    for (let i = 0; i < this._polygon.length - 1; ++i) {
      var v1 = [...this._polygon[i]];
      if (v1.length == 2) v1.push(0);
      var v2 = [...this._polygon[i + 1]];
      if (v2.length == 2) v2.push(0);
      const e01 = l(v0, v1);
      const e12 = l(v1, v2);
      const e20 = l(v2, v0);
      const s = (e01 + e12 + e20) / 2;
      A += area(e01, e12, e20, s);
    }
    return A;
  }
  
  normalizePolygon() {
    // Compute the center
    this._center = this.centerOfMass();
    for (let i = 0; i < this._polygon.length; ++i) {
      for (let j = 0; j < this._dim; ++j) {
        this._polygon[i][j] -= this._center[j];
      }
    }
    // Compute the surface area
    this._area = this.surfaceArea();
    // normalize the surface area to a target area
    const targetArea = 1;
    this._scaleFactor = Math.sqrt(1 / this._area * targetArea);
    for (let i = 0; i < this._polygon.length; ++i) {
      for (let j = 0; j < this._dim; ++j) {
        this._polygon[i][j] *= this._scaleFactor;
      }
    }
    if (Math.abs(this.surfaceArea() - targetArea) > 0.0001) {
      console.log("Something is wrong! The surface area is not as expected!");
    }
  }
  
  refinePolygon() {
    var polygon = [];
    for (let i = 0; i < this._polygon.length - 1; ++i) {
      var v1 = [...this._polygon[i]];
      var v2 = [...this._polygon[i + 1]];
      polygon.push(v1);
      let mid = Array(this._dim).fill(0);
      for (let j = 0; j < this._dim; ++j) {
        mid[j] = (v1[j] + v2[j]) / 2;
      }
      polygon.push(mid);
    }
    polygon.push(this._polygon[0]);
    this._polygon = polygon;
    this._numV = this._polygon.length;
    this.normalizePolygon();
  }
  
  reversePolygon() {
    var polygon = [];
    for (let i = this._polygon.length - 1; i >= 0; --i) {
      polygon.push(this._polygon[i]);
    }
    this._polygon = polygon;
    this._numV = this._polygon.length;
    this.normalizePolygon();
  }
  
  isInside(v0, v1, p) {
    if (this._polygon[0].length != 2) throw new Error("this formula works only for 2D Polygons.");
    return PGA2D.isInside(v0, v1, p);
  }
  
  async init() {
    // Read vertices from polygon files
    this._polygon = await PolygonIO.read(this._filename);
    this._numV = this._polygon.length;
    this._dim = this._polygon[0].length;
    // normalize the polygon
    this.normalizePolygon();
  }
}
