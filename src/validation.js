import fs from 'fs';
import path from 'path';
import { displayValidationError } from './output-formatter.js';

/**
 * @fileoverview Validation Functions for AVIF Image Optimizer
 * 
 * Provides comprehensive input validation with user-friendly error messages
 * and suggestions for common mistakes.
 * 
 * @module validation
 */

/**
 * Validate numeric range with helpful error messages
 * @param {string|number} value - The value to validate
 * @param {number} min - Minimum allowed value (inclusive)
 * @param {number} max - Maximum allowed value (inclusive)
 * @param {string} paramName - Parameter name for error messages
 * @param {string[]} [examples=[]] - Example usage strings for help
 * @returns {number} The validated numeric value
 * @throws {void} Exits process with code 1 if validation fails
 * @example
 * // Validate a quality value
 * const quality = validateNumericRange('80', 1, 100, 'Quality', ['--quality 60']);
 */
export function validateNumericRange(value, min, max, paramName, examples = []) {
  const num = parseInt(value);
  
  if (isNaN(num)) {
    displayValidationError(`${paramName} must be a number`, {
      examples: examples.length > 0 ? examples : undefined
    });
    process.exit(1);
  }
  
  if (num < min || num > max) {
    displayValidationError(`${paramName} must be between ${min} and ${max}`, {
      provided: num,
      examples: examples.length > 0 ? examples : undefined
    });
    process.exit(1);
  }
  
  return num;
}

/**
 * Validate quality parameter (1-100)
 * @param {string|number} value - The quality value to validate
 * @returns {number} The validated quality value between 1-100
 * @throws {void} Exits process with code 1 if validation fails
 * @example
 * const quality = validateQuality('80'); // Returns 80
 * validateQuality('150'); // Exits with error
 */
export function validateQuality(value) {
  return validateNumericRange(
    value, 
    1, 
    100, 
    'Quality', 
    ['--quality 60', '--quality 80', '--quality 90']
  );
}

/**
 * Validate effort parameter (1-10)
 * @param {string|number} value - The effort value to validate
 * @returns {number} The validated effort value between 1-10
 * @throws {void} Exits process with code 1 if validation fails
 * @example
 * const effort = validateEffort('6'); // Returns 6
 * validateEffort('15'); // Exits with error
 */
export function validateEffort(value) {
  return validateNumericRange(
    value, 
    1, 
    10, 
    'Effort', 
    ['--effort 4', '--effort 6', '--effort 8']
  );
}

/**
 * Validate that input path exists
 * @param {string} inputPath - The input path to validate (supports glob patterns)
 * @returns {{exists: boolean, isDirectory: boolean, path: string}} Validation result
 * @throws {void} Exits process with code 1 if path doesn't exist
 * @example
 * // Validate a file path
 * validateInputExists('./image.jpg');
 * 
 * // Validate a directory
 * validateInputExists('./images/');
 * 
 * // Validate a glob pattern
 * validateInputExists('./images/*.jpg');
 */
export function validateInputExists(inputPath) {
  let normalizedPath = inputPath;
  
  // Handle glob patterns - check if the base directory exists
  if (inputPath.includes('*') || inputPath.includes('?') || inputPath.includes('[')) {
    // Extract base directory from glob pattern
    const parts = inputPath.split(path.sep);
    let basePath = '';
    
    for (const part of parts) {
      if (part.includes('*') || part.includes('?') || part.includes('[')) {
        break;
      }
      basePath = basePath ? path.join(basePath, part) : part;
    }
    
    normalizedPath = basePath || '.';
  }
  
  // Resolve relative paths
  const resolvedPath = path.resolve(normalizedPath);
  
  try {
    const stats = fs.statSync(resolvedPath);
    return { exists: true, isDirectory: stats.isDirectory(), path: resolvedPath };
  } catch (error) {
    if (error.code === 'ENOENT') {
      displayValidationError('Input path does not exist', {
        path: resolvedPath,
        originalInput: inputPath,
        suggestions: [
          'Check if the path is spelled correctly',
          'Use quotes around paths with spaces: "my folder/image.jpg"',
          'For glob patterns, ensure the base directory exists',
          'Use relative paths from current directory or absolute paths'
        ]
      });
      process.exit(1);
    } else {
      displayValidationError(`Cannot access input path: ${error.message}`, {
        path: resolvedPath
      });
      process.exit(1);
    }
  }
}

/**
 * Validate output directory writability
 * @param {?string} outputDir - The output directory path (null uses input directory)
 * @returns {void}
 * @throws {void} Exits process with code 1 if directory is not writable
 * @example
 * // Validate existing directory
 * validateOutputDirectory('./output');
 * 
 * // Create and validate new directory
 * validateOutputDirectory('./new-output');
 * 
 * // Skip validation (use input directory)
 * validateOutputDirectory(null);
 */
export function validateOutputDirectory(outputDir) {
  if (!outputDir) {
    return; // Will use input directory, validated later
  }
  
  const resolvedPath = path.resolve(outputDir);
  
  try {
    // Check if directory exists
    if (fs.existsSync(resolvedPath)) {
      const stats = fs.statSync(resolvedPath);
      
      if (!stats.isDirectory()) {
        displayValidationError('Output path exists but is not a directory', {
          path: resolvedPath,
          suggestions: ['Please specify a directory path for output']
        });
        process.exit(1);
      }
      
      // Test writability by trying to create a temporary file
      const testFile = path.join(resolvedPath, '.avif-optimizer-test');
      try {
        fs.writeFileSync(testFile, '');
        fs.unlinkSync(testFile);
      } catch (writeError) {
        displayValidationError('Cannot write to output directory', {
          path: resolvedPath,
          reason: writeError.message,
          suggestions: [
            'Check directory permissions',
            'Try running with appropriate permissions',
            'Ensure the directory is not read-only'
          ]
        });
        process.exit(1);
      }
    } else {
      // Try to create the directory
      try {
        fs.mkdirSync(resolvedPath, { recursive: true });
        // Test writability
        const testFile = path.join(resolvedPath, '.avif-optimizer-test');
        fs.writeFileSync(testFile, '');
        fs.unlinkSync(testFile);
      } catch (createError) {
        displayValidationError('Cannot create output directory', {
          path: resolvedPath,
          reason: createError.message,
          suggestions: [
            'Check parent directory permissions',
            'Ensure parent directories exist',
            'Try using an absolute path'
          ]
        });
        process.exit(1);
      }
    }
  } catch (error) {
    displayValidationError('Cannot access output directory', {
      path: resolvedPath,
      reason: error.message
    });
    process.exit(1);
  }
}

/**
 * Validate dimensions parameters
 * @param {string|number|undefined} width - Maximum width in pixels
 * @param {string|number|undefined} height - Maximum height in pixels
 * @returns {void}
 * @throws {void} Exits process with code 1 if dimensions are invalid
 * @example
 * // Validate both dimensions
 * validateDimensions('1920', '1080');
 * 
 * // Validate only width
 * validateDimensions('1200', undefined);
 * 
 * // Skip validation
 * validateDimensions(undefined, undefined);
 */
export function validateDimensions(width, height) {
  if (width !== undefined) {
    const w = validateNumericRange(
      width, 
      1, 
      50000, 
      'Max width', 
      ['--max-width 800', '--max-width 1200', '--max-width 1920']
    );
    if (w < 1) {
      displayValidationError('Max width must be at least 1 pixel');
      process.exit(1);
    }
  }
  
  if (height !== undefined) {
    const h = validateNumericRange(
      height, 
      1, 
      50000, 
      'Max height', 
      ['--max-height 600', '--max-height 1200', '--max-height 1080']
    );
    if (h < 1) {
      displayValidationError('Max height must be at least 1 pixel');
      process.exit(1);
    }
  }
}

// Export aliases for backward compatibility if needed
export {
  validateNumericRange as validateNumericInput,
  validateQuality as validateQualityInput,
  validateEffort as validateEffortInput,
  validateDimensions as validateDimensionInput,
  validateOutputDirectory as validateOutputDirInput,
  validateInputExists as validatePathInput
};