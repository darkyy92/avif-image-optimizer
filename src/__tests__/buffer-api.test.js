/**
 * @fileoverview Tests for the Buffer-based API
 *
 * Covers convertBufferToAvif and isHeicBuffer. Fixtures are generated at
 * runtime with sharp, so no binary files need to live in the repo.
 */

import { jest } from '@jest/globals';
import sharp from 'sharp';
import { convertBufferToAvif, isHeicBuffer } from '../image-processor.js';

jest.setTimeout(60000); // AVIF encoding can be slow on CI hardware

/**
 * Create a solid-color JPEG buffer
 * @param {number} width
 * @param {number} height
 * @returns {Promise<Buffer>}
 */
async function createJpegBuffer(width, height) {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 220, g: 90, b: 40 }
    }
  })
    .jpeg({ quality: 90 })
    .toBuffer();
}

/**
 * Create a solid-color PNG buffer
 * @param {number} width
 * @param {number} height
 * @returns {Promise<Buffer>}
 */
async function createPngBuffer(width, height) {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 30, g: 144, b: 255, alpha: 1 }
    }
  })
    .png()
    .toBuffer();
}

/**
 * Build a minimal ISO BMFF header with the given ftyp brand
 * @param {string} brand - 4-character brand string (e.g. 'heic')
 * @returns {Buffer}
 */
function buildFtypHeader(brand) {
  const buffer = Buffer.alloc(24);
  buffer.writeUInt32BE(24, 0); // box size
  buffer.write('ftyp', 4, 'ascii'); // box type
  buffer.write(brand, 8, 'ascii'); // major brand
  return buffer;
}

describe('convertBufferToAvif', () => {
  test('converts a JPEG buffer to a resized AVIF buffer', async () => {
    const input = await createJpegBuffer(2000, 1000);

    const result = await convertBufferToAvif(input);

    expect(Buffer.isBuffer(result.buffer)).toBe(true);
    expect(result.buffer.length).toBeGreaterThan(0);

    // Default maxWidth/maxHeight is 1200, so 2000x1000 → 1200x600
    expect(result.width).toBe(1200);
    expect(result.height).toBe(600);
    expect(result.originalWidth).toBe(2000);
    expect(result.originalHeight).toBe(1000);
    expect(result.resized).toBe(true);
    expect(result.wasPreprocessed).toBe(false);
    expect(result.originalSize).toBe(input.length);
    expect(result.outputSize).toBe(result.buffer.length);
    expect(result.processingTime).toBeGreaterThan(0);

    // Verify the output really is a decodable AVIF with the right dimensions
    const outputMetadata = await sharp(result.buffer).metadata();
    expect(outputMetadata.width).toBe(1200);
    expect(outputMetadata.height).toBe(600);
    expect(outputMetadata.format).toBe('heif'); // sharp reports AVIF as heif/av1
  });

  test('converts a PNG buffer to AVIF', async () => {
    const input = await createPngBuffer(800, 600);

    const result = await convertBufferToAvif(input);

    expect(Buffer.isBuffer(result.buffer)).toBe(true);
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
    expect(result.resized).toBe(false);
  });

  test('respects the maxDimension shorthand', async () => {
    const input = await createJpegBuffer(2000, 1000);

    const result = await convertBufferToAvif(input, { maxDimension: 500 });

    expect(result.width).toBe(500);
    expect(result.height).toBe(250);
    expect(result.resized).toBe(true);

    const outputMetadata = await sharp(result.buffer).metadata();
    expect(outputMetadata.width).toBe(500);
    expect(outputMetadata.height).toBe(250);
  });

  test('explicit maxWidth/maxHeight override maxDimension', async () => {
    const input = await createJpegBuffer(2000, 2000);

    const result = await convertBufferToAvif(input, {
      maxDimension: 500,
      maxWidth: 300
    });

    // maxWidth 300 wins over maxDimension for width; height capped by maxDimension 500
    expect(result.width).toBeLessThanOrEqual(300);
    expect(result.height).toBeLessThanOrEqual(500);
  });

  test('never upscales small images', async () => {
    const input = await createJpegBuffer(300, 200);

    const result = await convertBufferToAvif(input, { maxDimension: 1200 });

    expect(result.width).toBe(300);
    expect(result.height).toBe(200);
    expect(result.resized).toBe(false);

    const outputMetadata = await sharp(result.buffer).metadata();
    expect(outputMetadata.width).toBe(300);
    expect(outputMetadata.height).toBe(200);
  });

  test('throws on a garbage buffer', async () => {
    const garbage = Buffer.from('this is definitely not an image file at all');

    await expect(convertBufferToAvif(garbage)).rejects.toThrow();
  });

  test('throws on empty or non-Buffer input', async () => {
    await expect(convertBufferToAvif(Buffer.alloc(0))).rejects.toThrow('non-empty Buffer');
    // @ts-expect-error - intentionally wrong type
    await expect(convertBufferToAvif('not-a-buffer')).rejects.toThrow('non-empty Buffer');
  });
});

describe('isHeicBuffer', () => {
  test.each(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1'])(
    'returns true for ftyp brand %s',
    (brand) => {
      expect(isHeicBuffer(buildFtypHeader(brand))).toBe(true);
    }
  );

  test('returns false for non-HEIC ftyp brands', () => {
    expect(isHeicBuffer(buildFtypHeader('isom'))).toBe(false); // generic MP4
    expect(isHeicBuffer(buildFtypHeader('avif'))).toBe(false); // AVIF is not HEIC
  });

  test('returns false for buffers without an ftyp box', async () => {
    const jpeg = await createJpegBuffer(10, 10);
    expect(isHeicBuffer(jpeg)).toBe(false);
    expect(isHeicBuffer(Buffer.from('random data here'))).toBe(false);
  });

  test('returns false for short or invalid input', () => {
    expect(isHeicBuffer(Buffer.alloc(0))).toBe(false);
    expect(isHeicBuffer(Buffer.from('ftyp'))).toBe(false); // too short
    // @ts-expect-error - intentionally wrong type
    expect(isHeicBuffer(null)).toBe(false);
    // @ts-expect-error - intentionally wrong type
    expect(isHeicBuffer('ftypheic')).toBe(false);
  });

  test('returns false for AVIF output produced by convertBufferToAvif', async () => {
    const input = await createJpegBuffer(50, 50);
    const result = await convertBufferToAvif(input);
    expect(isHeicBuffer(result.buffer)).toBe(false);
  });
});
