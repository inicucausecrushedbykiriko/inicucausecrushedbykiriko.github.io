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

/*
 Brain Volume Data from Brainweb: https://brainweb.bic.mni.mcgill.ca
 (raw short)
 image: signed__ short 0 to 4095
 image dimensions: zspace yspace xspace
    dimension name         length         step        start
    --------------         ------         ----        -----
    zspace                    181            1          -72
    yspace                    217            1         -126
    xspace                    181            1          -90
  the file scans the 3D image volume such that the 'X' coordinate changes fastest, and the 'Z' changes slowest.
  the image sizes along the X-Y-Z axes are 181x217x181 voxels (pixels).
  the voxel sizes along the X-Y-Z axes are 1x1x1 mm
 */

export default class VolumeByteIO {
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
          reject(new Error('Error loading volume byte data: ' + xhttp.status));
        }
      }
      xhttp.onerror = function() {
        reject(new Error('Network error loading volume byte data'));
      }
      xhttp.send();
    });
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

  static async read(filename) {
    let binarydata = await VolumeByteIO.readBinary(filename);
    let text = new TextDecoder().decode(binarydata);
    const dims = [181, 217, 181]; // only support this at the moment
    const sizes = [1, 1, 1]; // only support this size
    const data = [];
    let offset = 0;
    let view = new DataView(binarydata);
    for (let i = 0; i < dims.reduce((s, val) => s * val, 1); ++i) {
      const [value, delta] = VolumeByteIO.readBytes(view, offset, true, 'short');
      data.push(value);
      offset += delta;
    }
    return [dims, sizes, data];
  }

  static isLittleEndian() {
    const buffer = new ArrayBuffer(2);
    const view = new DataView(buffer);
    view.setInt16(0, 256, true); // Little-endian
    return view.getInt8(0) === 0; // if the machine is little endian, it should be true
  }

  static async write(volume, filename) {
    // javascript cannot direclty write to the client's machine
    // instead, we write to blog and download it
    
    // convert volume data to binary
    const volumeData = new Uint8Array(volume.data.length * 2); // 2 bytes per short
    volume.data.forEach((value, index) => {
      const view = new Uint16Array([value]);
      volumeData.set(new Uint8Array(view.buffer), index * 2);
    });
    const blob = new Blob([volumeData], { type : 'application/octet-stream' });
    // create a temp link element for download
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'download.raws';
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
