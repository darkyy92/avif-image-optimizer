/**
 * AVIF Image Optimizer - Programmatic API
 * 
 * Fast, modern image optimizer that converts JPG, PNG and other formats 
 * to AVIF with intelligent resizing and compression.
 */

import { optimizeImages } from './cli.js';
import { convertImageToAvif, analyzeImageFile } from './image-processor.js';
import { DEFAULT_CONFIG, SUPPORTED_FORMATS } from './constants.js';
import { generateMarkdownReport, generateJsonReport, generateReports } from './report-generator.js';

// Export the main functions for programmatic use
export { optimizeImages, convertImageToAvif, analyzeImageFile };

// Export report generation functions
export { generateMarkdownReport, generateJsonReport, generateReports };

// Re-export constants for programmatic API users
export { DEFAULT_CONFIG, SUPPORTED_FORMATS };

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
    const result = config.dryRun
      ? await analyzeImageFile(file, config)
      : await convertImageToAvif(file, config);
    if (result) {
      results.push(result);
    }
  }
  
  return results;
}