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

export default class PolygonIO {
  constructor() {}

  static readBinary(filename) {
    return new Promise((resolve, reject) => {
      const xhttp = new XMLHttpRequest();
      xhttp.open("GET", filename);
      xhttp.setRequestHeader("Cache-Control", "no-cache, no-store, max-age=0");
      xhttp.responseType = 'arraybuffer';
      xhttp.onload = function() {
        if (xhttp.readyState === XMLHttpRequest.DONE && xhttp.status === 200) {
          resolve(xhttp.response);
        }
        else {
          reject(new Error('Error loading Polygon file: ' + xhttp.status));
        }
      }
      xhttp.onerror = function() {
        reject(new Error('Network error loading Polygon file'));
      }
      xhttp.send();
    });
  }

  static async read(filename) { 
    let binarydata = await PolygonIO.readBinary(filename);
    let text = new TextDecoder().decode(binarydata);
    const polygon = [];
    const lines = text.split('\n');
    const headers = lines[0].trim().split(',');
    for (let i = 1; i < lines.length; ++i) {
      const line = lines[i].trim();
      if (line !== '') polygon.push(line.split(',').map(parseFloat));
    }
    return polygon;
  }

  static async write(polygon, filename) { 
    var data = '';
    if (polygon[0].length == 2) data = '# x, y\n';
    else data = '# x, y, z\n';
    for (let i = 0; i < polygon.length; ++i) {
      data += polygon[i].join(",") + '\n';
    }
    const blob = new Blob([data], { type : 'text/plain' });
    // create a temp link element for download
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'download.polygon';
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
