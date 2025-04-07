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

import MeshIO from "/lib/IO/MeshIO.js"

export default class PlyIO extends MeshIO {
  constructor() { }

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
          reject(new Error('Error loading PLY file: ' + xhttp.status));
        }
      }
      xhttp.onerror = function() {
        reject(new Error('Network error loading PLY file'));
      }
      xhttp.send();
    });
  }
  
  static readHeader(text) {
    const lines = text.split('\n');
    let offset = 0;
    let vertexCount = 0;
    let faceCount = 0;
    let vertexProperties = [];
    let faceProperties = [];
    let reading = 'format';
    let format = 'unknown';
    // Parse header
    offset += lines[0].length + 1; // # of chars + newline
    const line = lines[0].trim();
    if (line !== 'ply') {
      throw new Error('Input is not a ply file: ' + filename);
    }
    for (let i = 1; i < lines.length; ++i) {
      offset += lines[i].length + 1; // # of chars + newline
      const line = lines[i].trim();
      if (line === 'end_header') { // finish reading the header
        reading = 'data';
        break;
      }
      if (line.startsWith('format')) {
        format = line.split(' ')[1];
      }
      if (line.startsWith('element vertex')) {
        vertexCount = parseInt(line.split(' ')[2]);
        reading = 'vertex';
      }
      else if (line.startsWith('element face')) {
        faceCount = parseInt(line.split(' ')[2]);
        reading = 'face';
      }
      else if (line.startsWith('property')) {
        if (reading === 'vertex') {
          vertexProperties.push(line.split(' ').slice(1).join(' '));
        }
        else if (reading === 'face') {
          faceProperties.push(line.split(' ').slice(1).join(' '));
        }
      }
      // Note: comments are ignored
    }
    return [offset, vertexCount, faceCount, vertexProperties, faceProperties, format];
  }

  static readASCIIPly(text, vCnt, fCnt) {
    const vertices = [];
    const lines = text.split('\n'); 
    for (let i = 0; i < vCnt; ++i) {
      const line = lines[i].trim();
      vertices.push(line.split(' ').map(parseFloat));
    }
    const faces = [];
    for (let i = vCnt; i < vCnt + fCnt; ++i) {
      const line = lines[i].trim();
      let face = line.split(' ').slice(1);
      for (let i = 0; i < face.length - 2; ++i) {
        faces.push([parseInt(face[0]), parseInt(face[i + 1]), parseInt(face[i + 2])]);
      }
    }
    return [vertices, faces];
  }

  static readBytes(view, offset, isLittle, type) {
    switch (type) {
      case 'char': 
        return [view.getInt8(offset, 1)];
        break;
      case 'uchar':
        return [view.getUint8(offset, 1)];
        break;
      case 'short': 
        return [view.getInt16(offset, isLittle), 2];
        break;
      case 'ushort':
        return [view.getUint16(offset, isLittle), 2];
        break;
      case 'int': 
        return [view.getInt32(offset, isLittle), 4];
        break;
      case 'uint':
        return [view.getUint32(offset, isLittle), 4];
        break;
      case 'float':
        return [view.getFloat32(offset, isLittle), 4];
        break;
      case 'double':
        return [view.getFloat64(offset, isLittle), 8];
        break;
    }
  }

  static readBinaryPly(view, offset, vCnt, fCnt, vProp, fProp, fmt) {
    let isLittle = fmt.includes('little');
    const vertices = [];
    for (let i = 0; i < vCnt; ++i) {
      const vertex = [];
      for (let j = 0; j < vProp.length; ++j) {
        const [type, _] = vProp[j].split(' '); // not efficient...
        const [value, delta] = PlyIO.readBytes(view, offset, isLittle, type);
        vertex.push(value);
        offset += delta;
      }
      vertices.push(vertex);
    }
    const [fType, type1, type2, _] = fProp[0].split(' ');
    const faces = [];
    for (let i = 0; i < fCnt; ++i) {
      const [numIndices, delta] = PlyIO.readBytes(view, offset, isLittle, type1);
      offset += delta;
      const face = [];
      for (let j = 0; j < numIndices; ++j) {
        const [value, delta] = PlyIO.readBytes(view, offset, isLittle, type2);
        face.push(value);
        offset += delta;
      }
      for (let i = 0; i < face.length - 2; ++i) {
        faces.push([face[0], face[i + 1], face[i + 2]]);
      }
    }
    return [vertices, faces];
  }

  static async read(filename) {
    let binarydata = await PlyIO.readBinary(filename);
    let text = new TextDecoder().decode(binarydata);
    const [offset, vCnt, fCnt, vProp, fProp, fmt] = PlyIO.readHeader(text);
    if (fmt === 'ascii') {
      const [v, t] = PlyIO.readASCIIPly(text.substring(offset), vCnt, fCnt, vProp, fProp);
      return [v, t, vProp];
    }
    else {
      const [v, t] = PlyIO.readBinaryPly(new DataView(binarydata), offset, vCnt, fCnt, vProp, fProp, fmt);
      return [v, t, vProp];
    }
  }

  static isLittleEndian() {
    const buffer = new ArrayBuffer(2);
    const view = new DataView(buffer);
    view.setInt16(0, 256, true); // Little-endian
    return view.getInt8(0) === 0; // if the machine is little endian, it should be true
  }

  static async write(mesh, filename, isASCII = false) {
    // javascript cannot direclty write to the client's machine
    // instead, we write to blog and download it
    // First, create the header
    const isLittle = PlyIO.isLittleEndian();
    let plyData = 'ply\nformat ' + (isASCII ? 'ascii' : (isLittle ? 'binary_little_endian' : 'binary_big_endian')) + ' 1.0\n';
    plyData += `element vertex ${mesh.numV}\n`;
    for (let i = 0; i < mesh.vProp.length; ++i) {
      plyData += `property ${mesh.vProp[i]}\n`;
    }
    plyData += `element face ${mesh.numT}\n`;
    plyData += `property list int int vertex_indices\nend_header\n`;
    if (isASCII) {
      for (let i = 0; i < mesh.numV; ++i) {
        let line = '';
        for (let j = 0; j < mesh.vProp.length; ++j) {
          line += `${mesh.vertices[i * mesh.vProp.length + j]} `;
        }
        plyData += line.trim() + '\n';
      }
      for (let i = 0; i < mesh.numT; ++i) {
        plyData += `3 ${mesh.triangles[3 * i]} ${mesh.triangles[3 * i + 1]} ${mesh.triangles[3 * i + 2]}\n`;
      }
      const blob = new Blob([plyData], { type : 'text/plain' });
      // create a temp link element for download
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'download.ply';
      a.click();
      URL.revokeObjectURL(a.href);
    }
    else {
      // convert vertex data to binary
      const vertexData = new Uint8Array(mesh.vertices.length * 4); // 4 bytes per float
      mesh.vertices.forEach((value, index) => {
        const view = new Float32Array([value]);
        vertexData.set(new Uint8Array(view.buffer), index * 4);
      });
      // convert face data to binary
      const faceData = new Uint8Array(mesh.numT * 4 * 4); // (one numOfIndices + three indices) and  4 bytes per int
      for (let i = 0; i < mesh.numT; ++i) {
        const view = new Int32Array([3, mesh.triangles[3 * i], mesh.triangles[3 * i + 1], mesh.triangles[3 * i + 2]]);
        faceData.set(new Uint8Array(view.buffer), i * 4 * 4);
      }
      const blob = new Blob([new TextEncoder().encode(plyData), vertexData, faceData], { type : 'application/octet-stream' });
      // create a temp link element for download
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'download.ply';
      a.click();
      URL.revokeObjectURL(a.href);
    }
  }
}
