/**
 * @fileoverview Core image processing module for AVIF Image Optimizer
 * 
 * Handles image conversion, dimension optimization, and metadata processing
 * with support for HEIC/HEIF formats and comprehensive error handling.
 * 
 * @module image-processor
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import sharp from 'sharp';
import heicConvert from 'heic-convert';
import {
  verbose,
  formatTime,
  formatBytes
} from './output-formatter.js';
import {
  ERROR_TYPES,
  createError,
  createTimedErrorResponse
} from './error-handler.js';

/**
 * Timing utility functions for high precision measurement
 * @returns {{end: function(): number}} Timer object with end method
 * @example
 * const timer = createTimer();
 * // ... do some work ...
 * const elapsedMs = timer.end(); // Returns elapsed time in milliseconds
 */
export function createTimer() {
  const startTime = process.hrtime.bigint();
  
  return {
    end() {
      const endTime = process.hrtime.bigint();
      const duration = endTime - startTime;
      return Number(duration) / 1000000; // Convert nanoseconds to milliseconds
    }
  };
}

/**
 * Get optimized dimensions while maintaining aspect ratio
 * @param {number} width - Original width in pixels
 * @param {number} height - Original height in pixels
 * @param {number} maxWidth - Maximum allowed width in pixels
 * @param {number} maxHeight - Maximum allowed height in pixels
 * @returns {{width: number, height: number}} Optimized dimensions that fit within constraints
 * @example
 * // Scale a 3000x2000 image to fit within 1200x1200
 * const dims = getOptimizedDimensions(3000, 2000, 1200, 1200);
 * // Returns { width: 1200, height: 800 }
 */
export function getOptimizedDimensions(width, height, maxWidth, maxHeight) {
  const aspectRatio = width / height;
  
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }
  
  let newWidth, newHeight;
  
  if (width > height) {
    newWidth = Math.min(width, maxWidth);
    newHeight = Math.round(newWidth / aspectRatio);
  } else {
    newHeight = Math.min(height, maxHeight);
    newWidth = Math.round(newHeight * aspectRatio);
  }
  
  // Ensure we don't exceed max dimensions
  if (newWidth > maxWidth) {
    newWidth = maxWidth;
    newHeight = Math.round(newWidth / aspectRatio);
  }
  
  if (newHeight > maxHeight) {
    newHeight = maxHeight;
    newWidth = Math.round(newHeight * aspectRatio);
  }
  
  return { width: newWidth, height: newHeight };
}

/**
 * Convert HEIC/HEIF to intermediate format for Sharp processing
 * @param {Buffer} inputBuffer - Input image buffer
 * @param {number} quality - Quality setting (0-1 scale)
 * @returns {Promise<{buffer: Buffer|null, success: boolean, error?: string}>} Preprocessing result
 * @private
 */
async function preprocessHeicImage(inputBuffer, quality = 0.85) {
  try {
    verbose('  📱 Converting HEIC/HEIF to JPEG for processing...');
    
    const outputBuffer = await heicConvert({
      buffer: inputBuffer,
      format: 'JPEG',
      quality: quality
    });
    
    return {
      buffer: outputBuffer,
      success: true
    };
  } catch (error) {
    return {
      buffer: null,
      success: false,
      error: error.message
    };
  }
}

/**
 * Convert a single image file to AVIF
 * @param {string} inputPath - Path to input image
 * @param {Object} config - Configuration object
 * @param {number} config.quality - AVIF quality (1-100)
 * @param {number} config.effort - AVIF effort level (1-10)
 * @param {number} config.maxWidth - Maximum width in pixels
 * @param {number} config.maxHeight - Maximum height in pixels
 * @param {?string} config.outputDir - Output directory (null = same as input)
 * @param {boolean} config.preserveExif - Whether to preserve EXIF metadata
 * @param {boolean} config.force - Whether to overwrite existing files
 * @returns {Promise<{inputPath: string, outputPath: string, originalSize: number, outputSize?: number, sizeSavings?: number, originalWidth?: number, originalHeight?: number, newWidth?: number, newHeight?: number, resized?: boolean, wasPreprocessed?: boolean, skipped?: boolean, error?: string, errorCode?: string, processingTime: number, metadataTime?: number, conversionTime?: number}>} Processing result
 * @throws {Error} If preprocessing or conversion fails
 * @example
 * const result = await convertImageToAvif('./photo.jpg', {
 *   quality: 80,
 *   effort: 6,
 *   maxWidth: 1200,
 *   maxHeight: 1200,
 *   preserveExif: true
 * });
 */
export async function convertImageToAvif(inputPath, config) {
  const overallTimer = createTimer();
  
  try {
    const inputDir = path.dirname(inputPath);
    const inputExt = path.extname(inputPath).toLowerCase();
    const inputName = path.basename(inputPath, inputExt);
    const outputDir = config.outputDir || inputDir;
    const outputPath = path.join(outputDir, `${inputName}.avif`);

    // Skip if output exists and not forcing
    try {
      await fs.access(outputPath);
      if (!config.force) {
        return { 
          inputPath,
          outputPath,
          skipped: true 
        };
      }
    } catch {
      // File doesn't exist, continue processing
    }

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });
    
    // Read input file and handle HEIC preprocessing
    const metadataTimer = createTimer();
    let imageBuffer = await fs.readFile(inputPath);
    let sharpInput = inputPath;
    let wasPreprocessed = false;
    
    // Check if HEIC/HEIF file needs preprocessing
    if (['.heic', '.heif'].includes(inputExt)) {
      const preprocessResult = await preprocessHeicImage(
        imageBuffer, 
        config.quality / 100 // Convert quality scale
      );
      
      if (!preprocessResult.success) {
        throw createError(
          `HEIC preprocessing failed: ${preprocessResult.error}`,
          ERROR_TYPES.HEIC_PREPROCESSING_FAILED
        );
      }
      
      imageBuffer = preprocessResult.buffer;
      sharpInput = imageBuffer;
      wasPreprocessed = true;
      verbose('  📱 HEIC/HEIF preprocessing completed');
    }
    
    // Get image metadata and file size
    const metadata = await sharp(sharpInput).metadata();
    const metadataTime = metadataTimer.end();
    
    const { width: originalWidth, height: originalHeight } = metadata;
    const originalStats = await fs.stat(inputPath);
    const originalSize = originalStats.size;

    verbose(`Processing: ${inputPath}`);
    verbose(`Original dimensions: ${originalWidth}x${originalHeight}`);

    // Calculate optimized dimensions
    const { width: newWidth, height: newHeight } = getOptimizedDimensions(
      originalWidth,
      originalHeight,
      config.maxWidth,
      config.maxHeight
    );

    verbose(`Optimized dimensions: ${newWidth}x${newHeight}`);

    // Convert to AVIF with optimization
    const conversionTimer = createTimer();
    const sharpInstance = sharp(sharpInput)
      .resize(newWidth, newHeight, {
        kernel: sharp.kernel.lanczos3,
        withoutEnlargement: true
      });
    
    // Conditionally preserve EXIF metadata
    if (config.preserveExif) {
      sharpInstance.keepMetadata();
    }
    
    await sharpInstance
      .avif({
        quality: config.quality,
        effort: config.effort,
        chromaSubsampling: '4:2:0'
      })
      .toFile(outputPath);
    const conversionTime = conversionTimer.end();
    
    // Get output file size
    const outputStats = await fs.stat(outputPath);
    const outputSize = outputStats.size;
    
    // Calculate savings and total processing time
    const sizeSavings = ((originalSize - outputSize) / originalSize * 100).toFixed(1);
    const dimensionChange = originalWidth !== newWidth || originalHeight !== newHeight;
    const totalProcessingTime = overallTimer.end();

    return {
      inputPath,
      outputPath,
      originalSize,
      outputSize,
      sizeSavings: parseFloat(sizeSavings),
      originalWidth,
      originalHeight,
      newWidth,
      newHeight,
      resized: dimensionChange,
      preserveExif: config.preserveExif,
      wasPreprocessed: wasPreprocessed,
      skipped: false,
      processingTime: totalProcessingTime,
      metadataTime,
      conversionTime
    };
    
  } catch (error) {
    const totalProcessingTime = overallTimer.end();
    const outputPath = path.join(
      config.outputDir || path.dirname(inputPath),
      `${path.basename(inputPath, path.extname(inputPath))}.avif`
    );
    return {
      inputPath,
      outputPath,
      error: error.message,
      errorCode: error.code,
      processingTime: totalProcessingTime
    };
  }
}

/**
 * Analyze a single image file without converting (dry run)
 * @param {string} inputPath - Path to input image
 * @param {Object} config - Configuration object (same as convertImageToAvif)
 * @returns {Promise<{inputPath: string, outputPath: string, originalSize: number, outputSize: number, sizeSavings: number, originalWidth: number, originalHeight: number, newWidth: number, newHeight: number, resized: boolean, dimensionChange: boolean, wasPreprocessed: boolean, processingTime: number, metadataTime: number, error?: string, errorCode?: string}>} Analysis result with estimated output size
 * @example
 * // Analyze what would happen without actually converting
 * const analysis = await analyzeImageFile('./photo.jpg', config);
 * console.log(`Would save ${analysis.sizeSavings}% space`);
 */
export async function analyzeImageFile(inputPath, config) {
  const overallTimer = createTimer();
  
  try {
    const inputDir = path.dirname(inputPath);
    const inputExt = path.extname(inputPath).toLowerCase();
    const inputName = path.basename(inputPath, inputExt);
    const outputDir = config.outputDir || inputDir;
    const outputPath = path.join(outputDir, `${inputName}.avif`);

    // Handle HEIC preprocessing for analysis (dry run)
    const metadataTimer = createTimer();
    let sharpInput = inputPath;
    let wasPreprocessed = false;
    
    // Check if HEIC/HEIF file needs preprocessing for metadata reading
    if (['.heic', '.heif'].includes(inputExt)) {
      let imageBuffer = await fs.readFile(inputPath);
      const preprocessResult = await preprocessHeicImage(
        imageBuffer, 
        config.quality / 100
      );
      
      if (!preprocessResult.success) {
        throw createError(
          `HEIC preprocessing failed: ${preprocessResult.error}`,
          ERROR_TYPES.HEIC_PREPROCESSING_FAILED
        );
      }
      
      sharpInput = preprocessResult.buffer;
      wasPreprocessed = true;
      verbose('  📱 HEIC/HEIF preprocessing completed (dry run)');
    }
    
    const metadata = await sharp(sharpInput).metadata();
    const metadataTime = metadataTimer.end();
    
    const { width: originalWidth, height: originalHeight } = metadata;
    const originalStats = await fs.stat(inputPath);
    const originalSize = originalStats.size;

    const { width: newWidth, height: newHeight } = getOptimizedDimensions(
      originalWidth,
      originalHeight,
      config.maxWidth,
      config.maxHeight
    );

    const pixelRatio = (newWidth * newHeight) / (originalWidth * originalHeight);
    const estimatedSize = Math.round(originalSize * pixelRatio * 0.6);
    const sizeSavings = ((originalSize - estimatedSize) / originalSize * 100).toFixed(1);
    const dimensionChange = (originalWidth !== newWidth || originalHeight !== newHeight)
      ? ` (${originalWidth}x${originalHeight} → ${newWidth}x${newHeight})`
      : '';
    
    const totalProcessingTime = overallTimer.end();

    return {
      inputPath,
      outputPath,
      originalSize,
      outputSize: estimatedSize,
      sizeSavings: parseFloat(sizeSavings),
      originalWidth,
      originalHeight,
      newWidth,
      newHeight,
      resized: dimensionChange !== '',
      dimensionChange: dimensionChange !== '',
      preserveExif: config.preserveExif,
      wasPreprocessed: wasPreprocessed,
      processingTime: totalProcessingTime,
      metadataTime
    };
  } catch (error) {
    const totalProcessingTime = overallTimer.end();
    const outputPath = path.join(
      config.outputDir || path.dirname(inputPath),
      `${path.basename(inputPath, path.extname(inputPath))}.avif`
    );
    return {
      inputPath,
      outputPath,
      error: error.message,
      errorCode: error.code,
      processingTime: totalProcessingTime
    };
  }
}

/**
 * Check if file exists using async fs operations
 * @param {string} filePath - Path to check
 * @returns {Promise<boolean>} True if file exists, false otherwise
 * @example
 * if (await fileExists('./output.avif')) {
 *   console.log('Output already exists');
 * }
 */
export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file stats using async fs operations
 * @param {string} filePath - Path to file
 * @returns {Promise<import('fs').Stats|null>} File stats or null if error
 * @example
 * const stats = await getFileStats('./image.jpg');
 * if (stats) {
 *   console.log(`File size: ${stats.size} bytes`);
 * }
 */
export async function getFileStats(filePath) {
  try {
    return await fs.stat(filePath);
  } catch {
    return null;
  }
}