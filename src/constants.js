/**
 * @fileoverview AVIF Image Optimizer - Shared Constants
 * 
 * Central location for all configuration defaults and constants
 * shared between CLI and programmatic interfaces.
 * 
 * @module constants
 */

/**
 * Default configuration for image optimization
 * @typedef {Object} DefaultConfig
 * @property {number} maxWidth - Maximum width in pixels (default: 1200)
 * @property {number} maxHeight - Maximum height in pixels (default: 1200)
 * @property {number} quality - AVIF quality 1-100 (default: 60)
 * @property {number} effort - AVIF effort level 0-10 (default: 6)
 * @property {?string} outputDir - Output directory path (null = same as input)
 * @property {boolean} preserveOriginal - Keep original files (default: true)
 * @property {boolean} preserveExif - Preserve EXIF metadata (default: false)
 * @property {boolean} recursive - Process directories recursively (default: false)
 * @property {boolean} force - Overwrite existing AVIF files (default: false)
 * @property {boolean} verbose - Show detailed output (default: false)
 * @property {boolean} quiet - Suppress all output except errors (default: false)
 * @property {boolean} json - Output results as JSON (default: false)
 * @property {boolean} dryRun - Preview without processing (default: false)
 * @property {string[]} exclude - Glob patterns to exclude (default: [])
 * @constant {DefaultConfig}
 */
export const DEFAULT_CONFIG = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 60,
  effort: 6,
  outputDir: null, // Same directory as input by default
  preserveOriginal: true,
  preserveExif: false, // Strip metadata by default for smaller files
  recursive: false,
  force: false,
  verbose: false,
  quiet: false,
  json: false,
  dryRun: false,
  exclude: []
};

/**
 * Supported input image formats
 * Includes common formats and iPhone/modern camera formats (HEIC/HEIF)
 * @constant {string[]}
 * @example
 * // Check if a file is supported
 * const isSupported = SUPPORTED_FORMATS.includes(path.extname(filename).toLowerCase());
 */
export const SUPPORTED_FORMATS = [
  '.jpg', 
  '.jpeg', 
  '.png', 
  '.webp', 
  '.tiff', 
  '.tif', 
  '.heic', 
  '.heif'
];