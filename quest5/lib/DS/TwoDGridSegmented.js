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
/*!
 * TwoDGridSegmented.js
 *
 * Provides a 2D spatial grid for fast inside/outside tests.
 * Contains loop safeguards to avoid infinite loops.
 */

import PGA2D from '/quest5/lib/Math/PGA2D.js';

export default class TwoDGridSegmented {
  static EXTERIOR = 'exterior';
  static INTERIOR = 'interior';
  static MIXED    = 'mixed';
  static UNKNOWN  = 'unknown';
  
  constructor(polygon, grid_size) {
    // Expect polygon._polygon to be an array of [x,y] points.
    this._polygon = JSON.parse(JSON.stringify(polygon));
    if (!Array.isArray(this._polygon._polygon) || this._polygon._polygon[0].length !== 2) {
      throw new Error("TwoDGridSegmented works only for 2D polygon data.");
    }
    this._grid_size = grid_size;
    if (!Number.isInteger(grid_size) || grid_size < 1) {
      throw new Error("Grid size must be an integer >= 1.");
    }
    const n = this._polygon._polygon.length - 1;
    this._dirs = Array.from({ length: n }, () => []);
    
    let minx = 1e15, miny = 1e15;
    let maxx = -1e15, maxy = -1e15;
    for (let i = 0; i < n; i++) {
      const v0 = this._polygon._polygon[i];
      const v1 = this._polygon._polygon[i + 1];
      this._dirs[i].push(v1[0] - v0[0], v1[1] - v0[1]);
      minx = Math.min(minx, v0[0], v1[0]);
      miny = Math.min(miny, v0[1], v1[1]);
      maxx = Math.max(maxx, v0[0], v1[0]);
      maxy = Math.max(maxy, v0[1], v1[1]);
    }
    this.EPSILON = Math.min((maxx - minx) / grid_size, (maxy - miny) / grid_size) * 1e-4;
    this._boundingBox = [minx - this.EPSILON, miny - this.EPSILON,
                         maxx + this.EPSILON, maxy + this.EPSILON];
    this.initCells();
  }
  
  getPointOnSegment(idx, t) {
    const v0 = this._polygon._polygon[idx];
    const [dx, dy] = this._dirs[idx];
    return [ v0[0] + dx * t, v0[1] + dy * t ];
  }
  
  initCells() {
    this._cells = Array.from({ length: this._grid_size }, () =>
      Array.from({ length: this._grid_size }, () => [[], [], TwoDGridSegmented.UNKNOWN])
    );
    const [bx0, by0, bx1, by1] = this._boundingBox;
    this._dx = (bx1 - bx0) / this._grid_size;
    this._dy = (by1 - by0) / this._grid_size;
    for (let y = 0; y < this._grid_size; y++) {
      for (let x = 0; x < this._grid_size; x++) {
        let x0 = bx0 + x * this._dx;
        let y0 = by0 + y * this._dy;
        this._cells[y][x][0] = [x0, y0, x0 + this._dx, y0 + this._dy];
      }
    }
  }
  
  getCellIdx(p) {
    const [bx0, by0, bx1, by1] = this._boundingBox;
    if (p[0] < bx0 || p[0] > bx1 || p[1] < by0 || p[1] > by1) return [-1, -1];
    let cx = Math.floor((p[0] - bx0) / this._dx);
    let cy = Math.floor((p[1] - by0) / this._dy);
    if (cx < 0 || cx >= this._grid_size || cy < 0 || cy >= this._grid_size) return [-1, -1];
    return [cx, cy];
  }
  
  getCellHitPoints(cell, startPt, dir) {
    const [cminx, cminy, cmaxx, cmaxy] = cell[0];
    const xt0 = (cminx - startPt[0]) / dir[0];
    const xt1 = (cmaxx - startPt[0]) / dir[0];
    const yt0 = (cminy - startPt[1]) / dir[1];
    const yt1 = (cmaxy - startPt[1]) / dir[1];
    return [xt0, xt1, yt0, yt1];
  }
  
  computeCellLineSegments() {
    const nEdges = this._polygon._polygon.length - 1;
    for (let i = 0; i < nEdges; i++) {
      const v0 = this._polygon._polygon[i];
      const v1 = this._polygon._polygon[i + 1];
      const [sx, sy] = this.getCellIdx(v0);
      const [ex, ey] = this.getCellIdx(v1);
      if (sx === ex && sy === ey && sx !== -1 && sy !== -1) {
        this._cells[sy][sx][1].push([i, 0, 1]);
        this._cells[sy][sx][2] = TwoDGridSegmented.MIXED;
      } else {
        const [dx, dy] = this._dirs[i];
        if (Math.abs(dx) < 1e-14 && Math.abs(dy) < 1e-14) continue;
        let t = 0;
        let iterationCount = 0;
        while (t < 1) {
          iterationCount++;
          if (iterationCount > 999999) {
            console.warn("computeCellLineSegments: too many steps on edge", i);
            break;
          }
          const p_in = this.getPointOnSegment(i, t + this.EPSILON);
          const [cx, cy] = this.getCellIdx(p_in);
          if (cx === -1 || cy === -1) break;
          const cell = this._cells[cy][cx];
          const hits = this.getCellHitPoints(cell, v0, [dx, dy]);
          const validHits = hits.filter(val => val > (t + 1e-12));
          if (validHits.length === 0) {
            cell[1].push([i, t, 1]);
            cell[2] = TwoDGridSegmented.MIXED;
            break;
          }
          let next_t = Math.min(...validHits);
          if (next_t > 1) {
            cell[1].push([i, t, 1]);
            cell[2] = TwoDGridSegmented.MIXED;
            break;
          }
          cell[1].push([i, t, next_t]);
          cell[2] = TwoDGridSegmented.MIXED;
          t = next_t;
        }
      }
    }
  }
  
  assignCellTypes() {
    this.computeCellLineSegments();
    let needtocheck = [];
    for (let y = 0; y < this._grid_size; y++) {
      for (let x = 0; x < this._grid_size; x++) {
        if (this._cells[y][x][2] === TwoDGridSegmented.UNKNOWN)
          needtocheck.push([x, y]);
      }
    }
    const moves = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (needtocheck.length > 0) {
      let [cx, cy] = needtocheck.shift();
      if (this._cells[cy][cx][2] !== TwoDGridSegmented.UNKNOWN) continue;
      let stack = [[cx, cy]];
      let region = new Set();
      region.add(JSON.stringify([cx, cy]));
      let connectedLabel = TwoDGridSegmented.UNKNOWN;
      let iterationCount = 0;
      while (stack.length > 0) {
        iterationCount++;
        if (iterationCount > 200000) {
          console.warn("assignCellTypes: BFS too large; labeling region as EXTERIOR");
          connectedLabel = TwoDGridSegmented.EXTERIOR;
          break;
        }
        let [ux, uy] = stack.pop();
        if (this._cells[uy][ux][2] !== TwoDGridSegmented.UNKNOWN) continue;
        for (let m of moves) {
          let nx = ux + m[0], ny = uy + m[1];
          if (nx >= 0 && nx < this._grid_size && ny >= 0 && ny < this._grid_size) {
            let c2 = this._cells[ny][nx];
            if (c2[2] === TwoDGridSegmented.UNKNOWN) {
              let key = JSON.stringify([nx, ny]);
              if (!region.has(key)) {
                region.add(key);
                stack.push([nx, ny]);
              }
            } else if (c2[2] !== TwoDGridSegmented.MIXED) {
              connectedLabel = c2[2];
            }
          }
        }
      }
      if (connectedLabel === TwoDGridSegmented.UNKNOWN && region.size > 0) {
        let first = region.values().next().value;
        let [rx, ry] = JSON.parse(first);
        let [bbx0, bby0, bbx1, bby1] = this._cells[ry][rx][0];
        let mid = [(bbx0 + bbx1) * 0.5, (bby0 + bby1) * 0.5];
        connectedLabel = this.isInsideWindingNumber(mid)
          ? TwoDGridSegmented.INTERIOR
          : TwoDGridSegmented.EXTERIOR;
      }
      region.forEach(val => {
        let [fx, fy] = JSON.parse(val);
        this._cells[fy][fx][2] = connectedLabel;
      });
    }
  }
  
  isInsideWindingNumber(p) {
    const poly = this._polygon._polygon;
    let w1 = 0, w2 = 0;
    for (let i = 0; i < poly.length - 1; i++) {
      let v0 = poly[i];
      let v1 = poly[i + 1];
      if (((v0[1] <= p[1]) && (v1[1] > p[1])) ||
          ((v0[1] > p[1]) && (v1[1] <= p[1]))) {
        let xint = v0[0] + (p[1] - v0[1]) * (v1[0] - v0[0]) / ((v1[1] - v0[1]) + 1e-14);
        if (xint > p[0]) {
          if (PGA2D.isInside(v0, v1, p)) w1++; else w1--;
        } else {
          if (PGA2D.isInside(v0, v1, p)) w2++; else w2--;
        }
      }
    }
    return !(w1 === 0 || w2 === 0);
  }
  
  isInside(segments, p) {
    const onLeft = (a, b, q) => ((b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0])) >= 0;
    let [pt, seg] = this.getClosestPointAndSegmentOnSegments(segments, p);
    let v0 = this.getPointOnSegment(seg[0], seg[1]);
    let v1 = this.getPointOnSegment(seg[0], seg[2]);
    return onLeft(v0, v1, p);
  }
  
  getClosestPointAndSegmentOnSegments(segments, p) {
    let minD = Number.MAX_VALUE;
    let bestPt = [0, 0];
    let bestSeg = null;
    const dot = (u, v) => u[0] * v[0] + u[1] * v[1];
    for (let s of segments) {
      let v0 = this.getPointOnSegment(s[0], s[1]);
      let v1 = this.getPointOnSegment(s[0], s[2]);
      let segv = [v1[0] - v0[0], v1[1] - v0[1]];
      let v0p = [p[0] - v0[0], p[1] - v0[1]];
      let denom = dot(segv, segv) || 1e-9;
      let t = dot(v0p, segv) / denom;
      t = Math.max(0, Math.min(1, t));
      let px = v0[0] + segv[0] * t;
      let py = v0[1] + segv[1] * t;
      let dx = p[0] - px, dy = p[1] - py;
      let d2 = dx * dx + dy * dy;
      if (d2 < minD) {
        minD = d2;
        bestPt = [px, py];
        bestSeg = s;
      }
    }
    return [bestPt, bestSeg];
  }
  
  isOutsideAssumeLocalConvex(p) {
    let [cx, cy] = this.getCellIdx(p);
    if (cx === -1 && cy === -1) return true;
    let cell = this._cells[cy][cx];
    if (cell[2] === TwoDGridSegmented.INTERIOR) return false;
    if (cell[2] === TwoDGridSegmented.EXTERIOR) return true;
    let segments = cell[1].slice();
    let rng = 1;
    while (segments.length === 0 && rng < Math.max(10, this._grid_size)) {
      for (let oy = -rng; oy <= rng; oy++) {
        let ny = cy + oy;
        if (ny < 0 || ny >= this._grid_size) continue;
        for (let ox = -rng; ox <= rng; ox++) {
          let nx = cx + ox;
          if (nx < 0 || nx >= this._grid_size) continue;
          let c2 = this._cells[ny][nx];
          if (c2[2] === TwoDGridSegmented.MIXED) {
            segments = segments.concat(c2[1]);
          }
        }
      }
      rng++;
    }
    return !this.isInside(segments, p);
  }
  
  async init() {
    this.computeCellLineSegments();
    this.assignCellTypes();
  }
}
