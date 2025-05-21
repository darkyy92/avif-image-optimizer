/**
 * AVIF Image Optimizer - Programmatic API
 * 
 * Fast, modern image optimizer that converts JPG, PNG and other formats 
 * to AVIF with intelligent resizing and compression.
 */

import { optimizeImages, convertImageToAvif } from './cli.js';

// Export the main functions for programmatic use
export { optimizeImages, convertImageToAvif };

// Default configuration
export const DEFAULT_CONFIG = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 60,
  effort: 6,
  outputDir: null,
  preserveOriginal: true,
  recursive: false,
  exclude: []
};

// Supported formats
export const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif'];

/**
 * Quick optimization with default settings
 * @param {string} input - Input file or directory
 * @param {object} options - Optional configuration overrides
 */
export async function optimizeToAvif(input, options = {}) {
  return await optimizeImages(input, { ...DEFAULT_CONFIG, ...options });
}

/**
 * Batch convert multiple files
 * @param {string[]} files - Array of file paths
 * @param {object} options - Configuration options
 */
export async function batchConvert(files, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };
  const results = [];
  
  for (const file of files) {
    const result = await convertImageToAvif(file, config);
    if (result) {
      results.push(result);
    }
  }
  
  return results;
}