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
 
import PGA2D from '/lib/Math/PGA2D.js';
 
export default class TwoDGridSegmented {
  // define enum for node types
  static EXTERIOR = 'exterior';
  static INTERIOR = 'interior';
  static MIXED = 'mixed';
  static UNKNOWN = 'unknown';
  
  constructor(polygon, grid_size) {
    this._polygon = JSON.parse(JSON.stringify(polygon)); // deep copy the input polygon
    if (this._polygon[0].length != 2) throw new Error("TwoDGrid works only for 2D Polygons.");
    this._grid_size = grid_size;
    if (Math.floor(this._grid_size) != this._grid_size || this._grid_size < 1) throw new Error("TwoDGrid grid size must be an integer greater than 0.");
    this._dirs = Array.from({ length: this._polygon.length - 1 }, () => []);
    // Compute the bounding box and which line segments are in the current cell
    let minx = Number.MAX_VALUE;
    let miny = Number.MAX_VALUE;
    let maxx = -Number.MAX_VALUE;
    let maxy = -Number.MAX_VALUE;
    let lines = [];
    for (let i = 0; i < this._polygon.length - 1; ++i) {
      const v0 = this._polygon[i];
      const v1 = this._polygon[i + 1];
      for (let j = 0; j < 2; ++j) this._dirs[i].push((v1[j] - v0[j]));
      minx = Math.min(v0[0], minx);
      miny = Math.min(v0[1], miny);
      maxx = Math.max(v0[0], maxx);
      maxy = Math.max(v0[1], maxy);
      lines.push([i, 0, 1]); // at the beginning, the entire line is the line segment
    }
    // Define an epsilon
    this.EPSILON = Math.min((maxx - minx) / this._grid_size, (maxy - miny) / this._grid_size) * 1e-4;
    this._boundingBox = [minx - this.EPSILON, miny - this.EPSILON, maxx + this.EPSILON, maxy + this.EPSILON]; // add epsilon to the bounding box
    this.initCells(); // this function will init the grid cells by cutting polygon edges into line segments
  }
  
  // A helper function compute the point on a segment given an edge index and t value
  getPointOnSegment(idx, t) {
    return Array.from({ length: 2 }, (_, i) => this._polygon[idx][i] + t * this._dirs[idx][i]);
  }
  
  // A function to initialize the cells
  initCells() {
    // init the cells with all unknowns
    this._cells = Array.from({ length: this._grid_size }, () => Array.from({ length: this._grid_size }, () => [[], [], TwoDGridSegmented.UNKNOWN]));
    // compute the cell's bounding boxes
    this._dx = (this._boundingBox[2] - this._boundingBox[0]) / this._grid_size;
    this._dy = (this._boundingBox[3] - this._boundingBox[1]) / this._grid_size;
    // each cell stores a bounding box, a list of line segments in the format [idx, t0, t1], and a node type
    // idx is the index in _polygon and idx -> idx + 1 from an edge of a polygon
    // assuming there is a ratio from 0 to 1 to the edge, t0, t1 with t0 < t1 specifies the line segments on the edge
    // e.g. the edge is v0 -> v1, then the line segment is v0 + t0 * d -> v0 + t1 * d where d = (v1 - v0) is the unit direction
    for (let y = 0; y < this._grid_size; ++y) {
      const y0 = this._boundingBox[1] + y * this._dy;
      const y1 = y0 + this._dy;
      for (let x = 0; x < this._grid_size; ++x) {
        const x0 = this._boundingBox[0] + x * this._dx;
        const x1 = x0 + this._dx;
        this._cells[y][x][0] = [x0, y0, x1, y1];
      }
    }
  }
  
  // A helper function to convert a point to cell index - by rounding down to the grid cells
  getCellIdx(p) {
    const [minx, miny, maxx, maxy] = this._boundingBox;
    if (minx < p[0] && p[0] < maxx && miny < p[1] && p[1] < maxy) { // bounding box checking
      // round down to get the cell x, y index
      return [Math.floor((p[0] - minx) / this._dx), Math.floor((p[1] - miny) / this._dy)];
    }
    else return [-1, -1]; // out of bound
  }
  
  // A helper function to use the bounding box to check if a point is in a cell
  isInCell(x, y, p) {
    const [minx, miny, maxx, maxy] = this._cells[y][x][0];
    return minx < p[0] && p[0] < maxx && miny < p[1] && p[1] < maxy;
  }
  
  // A function to compute the hit points of the four edges of a cell
  getCellHitPoints(c, st, dir) {
    const [minx, miny, maxx, maxy] = c[0];
    const xt0 = (minx - st[0]) / dir[0];
    const xt1 = (maxx - st[0]) / dir[0];
    const yt0 = (miny - st[1]) / dir[1];
    const yt1 = (maxy - st[1]) / dir[1];
    return [xt0, xt1, yt0, yt1];
  }
  
  // An important function to cut the line segments into cells
  computeCellLineSegments() {
    for (let i = 0; i < this._polygon.length - 1; ++i) {
      // compute the cell index of the start point
      const v0 = this._polygon[i];
      const [sx, sy] = this.getCellIdx(v0);
      // compute the cell index of the end point
      const v1 = this._polygon[i + 1];
      const [ex, ey] = this.getCellIdx(v1);
      if (sx == ex && sy == ey) { // the entire edge is in a cell
        const c = this._cells[sy][sx];
        c[1].push([i, 0, 1]);
        c[2] = TwoDGridSegmented.MIXED;
      }
      else { // the edge is across multiple cells
        const d = this._dirs[i];
        let t = 0;
        while (t < 1) {
          const s_pt = this.getPointOnSegment(i, t);
          const p_inside = this.getPointOnSegment(i, t + this.EPSILON); // add epsilon to make sure the start point is in the cell
          const [x, y] = this.getCellIdx(p_inside);
          const c = this._cells[y][x];
          const [xt0, xt1, yt0, yt1] = this.getCellHitPoints(c, v0, d);
          const next_t = Math.min(...[xt0, xt1, yt0, yt1].filter((val) => val > t));
          if (next_t < 1) {
            c[1].push([i, t, next_t]);
            c[2] = TwoDGridSegmented.MIXED;
          }
          else {
            c[1].push([i, t, 1]);
            c[2] = TwoDGridSegmented.MIXED;
          }
          t = next_t;
        }
      }
    }
  }
  
  // flood flowing algorithm to assign labels to the cells
  assignCellTypes() {
    // check if unknown cell is interior or exterior
    var needtocheck = [];
    for (let y = 0; y < this._grid_size; ++y) for (let x = 0; x < this._grid_size; ++x) {
      if (this._cells[y][x][2] == TwoDGridSegmented.UNKNOWN) needtocheck.push([x, y]);
    }
    // use a greedy flood flowing algorithm to fill the cell types
    const moves = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    while (needtocheck.length) {
      let [x, y] = needtocheck.shift();
      if (this._cells[y][x][2] == TwoDGridSegmented.UNKNOWN) { // if it is still unknown
        let unknownconnectedgroup = new Set();
        unknownconnectedgroup.add(JSON.stringify([x, y]));
        // To avoid expensive computation, we find the connected group first
        let unknowncandidates = [];
        unknowncandidates.push([x, y]);
        let connectedLabel = TwoDGridSegmented.UNKNOWN;
        while (unknowncandidates.length) {
          unknowncandidates.shift();
          // greedy approach to check the four directions
          for (let i = 0; i < moves.length; ++i) {
            const m = moves[i];
            const nx = x + m[0];
            const ny = y + m[1];
            if (nx >= 0 && nx < this._grid_size && ny >= 0 && ny < this._grid_size) {
              const c = this._cells[ny][nx];
              if (c[2] == TwoDGridSegmented.UNKNOWN) {
                if (!unknownconnectedgroup.has(JSON.stringify([nx, ny]))) {
                  unknownconnectedgroup.add(JSON.stringify([nx, ny]));
                  unknowncandidates.push([nx, ny]);
                }
              }
              else if (c[2] != TwoDGridSegmented.MIXED){
                connectedLabel = c[2]; // connected to a known group
              }
            }
          }
        }
        // if we know which group the current unknown group connected to, the entire group belongs to this group
        if (connectedLabel == TwoDGridSegmented.UNKNOWN){
          const [val] = unknownconnectedgroup;
          const [_x, _y] = JSON.parse(val);
          const oc = this._cells[_y][_x];
          const [minx, miny, maxx, maxy] = oc[0];
          const mid = [(minx + maxx) / 2, (miny + maxy) / 2];
          connectedLabel = this.isInsideWindingNumber(mid) ? TwoDGridSegmented.INTERIOR : TwoDGridSegmented.EXTERIOR;
          oc[2] = connectedLabel;
        }
        unknownconnectedgroup.forEach((val) => {
          const [_x, _y] = JSON.parse(val);
          this._cells[_y][_x][2] = connectedLabel;
        });
      }
    }
  }
  
  // an implementation of the winding number to check if a point is inside a polygon or not
  isInsideWindingNumber(p) {
    // TODO: Put you Winding Number implementation here
    
    return false;
  }
  
  isInside(segments, p) {
    const onLeft = (v0, v1, p) => ((v1[0] - v0[0]) * (p[1] - v0[1]) - (v1[1] - v0[1]) * (p[0] - v0[0])) >= 0;
    const [_, seg] = this.getClosestPointAndSegmentOnSegments(segments, p);
    const v0 = this.getPointOnSegment(seg[0], seg[1]);
    const v1 = this.getPointOnSegment(seg[0], seg[2]);
    return onLeft(v0, v1, p);
  }
  
  getClosestPointAndSegmentOnSegments(segments, p) {
    const distance = (a, b) => Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
    let mindist = Number.MAX_VALUE;
    let minpp = [Number.MAX_VALUE, Number.MAX_VALUE];
    let minseg = null;
    for (let i = 0; i < segments.length; ++i) {
      const s = segments[i];
      const v0 = this.getPointOnSegment(s[0], s[1]);
      const v1 = this.getPointOnSegment(s[0], s[2]);
      const v01 = [v1[0] - v0[0], v1[1] - v0[1]];
      const v0p = [p[0] - v0[0], p[1] - v0[1]];
      let t = dot(v0p, v01) / dot(v01, v01);
      t = Math.max(Math.min(1, t), 0);
      const pp = [v0[0] + v01[0] * t, v0[1] + v01[1] * t];
      const dist = distance(pp, p);
      if (dist < mindist) {
        mindist = dist;
        minpp = pp;
        minseg = s;
      }
    }
    return [minpp, minseg];
  }
  
  isOutsideAssumeLocalConvex(p) {
    let [x, y] = this.getCellIdx(p);
    if (x == -1 && y == -1) return true;
    else {
      let c = this._cells[y][x];
      if (c[2] == TwoDGridSegmented.INTERIOR) return false;
      if (c[2] == TwoDGridSegmented.EXTERIOR) return true;
      let segments = [].concat(c[1]);
      let rng = 1;
      while (segments.length == 0) { // expand by 1-ring, 2-ring, 3-ring, ...
        for (let oy = -rng; oy != rng + 1; ++oy) if (oy + y >= 0 && oy + y < this._grid_size) {
          for (let ox = -rng; ox != rng + 1; ++ox) if (ox + x >= 0 && ox + x < this._grid_size) {
            const cc = this._cells[y + oy][x + ox];
            if (cc[2] == TwoDGridSegmented.MIXED) {
              segments = segments.concat(cc[1]);
            }
          }
        }
        rng += 1;
      }
      return !this.isInside(segments, p); 
    }
  }
  
  async init() {
    this.computeCellLineSegments();
    this.assignCellTypes();
  }
}
