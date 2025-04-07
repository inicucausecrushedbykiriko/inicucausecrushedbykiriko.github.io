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
 
import VolumeByteIO from "/lib/IO/VolumeByteIO.js"

export default class VolumeData {
  // Note: Volume Data comes from Brainweb: https://brainweb.bic.mni.mcgill.ca
  constructor(filename) {
    this._filename = filename;
  }
  
  async init() {
    // Read volume data from file
    const [dims, sizes, data] = await VolumeByteIO.read(this._filename);
    this._dims = dims;
    this._sizes = sizes;
    this._data = data;
  }
}
