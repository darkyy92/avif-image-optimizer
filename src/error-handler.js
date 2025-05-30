/**
 * @fileoverview Centralized error handling module for AVIF Image Optimizer
 * 
 * Provides consistent error formatting, type classification, and helpful
 * user-facing suggestions for common error scenarios.
 * 
 * @module error-handler
 */

/**
 * Error type constants for categorizing different failure modes
 * @enum {string}
 * @readonly
 */
export const ERROR_TYPES = {
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  CONVERSION_FAILED: 'CONVERSION_FAILED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NO_SPACE_LEFT: 'NO_SPACE_LEFT',
  INVALID_INPUT: 'INVALID_INPUT',
  METADATA_ERROR: 'METADATA_ERROR',
  WRITE_ERROR: 'WRITE_ERROR',
  HEIC_PREPROCESSING_FAILED: 'HEIC_PREPROCESSING_FAILED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * Map system error codes to our error types
 * @type {Object.<string, string>}
 * @private
 */
const ERROR_CODE_MAP = {
  'ENOENT': ERROR_TYPES.FILE_NOT_FOUND,
  'EACCES': ERROR_TYPES.PERMISSION_DENIED,
  'ENOSPC': ERROR_TYPES.NO_SPACE_LEFT,
  'EPERM': ERROR_TYPES.PERMISSION_DENIED,
  'EISDIR': ERROR_TYPES.INVALID_INPUT,
  'ENOTDIR': ERROR_TYPES.INVALID_INPUT
};

/**
 * Error suggestions for each error type
 * @type {Object.<string, string>}
 * @private
 */
const ERROR_SUGGESTIONS = {
  [ERROR_TYPES.FILE_NOT_FOUND]: 'The file was not found or was deleted during processing',
  [ERROR_TYPES.UNSUPPORTED_FORMAT]: 'The file format is not supported or the file is corrupted',
  [ERROR_TYPES.PERMISSION_DENIED]: 'Permission denied - check file/directory permissions',
  [ERROR_TYPES.NO_SPACE_LEFT]: 'No space left on device - free up disk space',
  [ERROR_TYPES.INVALID_INPUT]: 'Invalid input - check file path and type',
  [ERROR_TYPES.METADATA_ERROR]: 'Unable to read image metadata - file may be corrupted',
  [ERROR_TYPES.WRITE_ERROR]: 'Unable to write output file - check permissions and disk space',
  [ERROR_TYPES.CONVERSION_FAILED]: 'Image conversion failed - try adjusting quality or dimensions',
  [ERROR_TYPES.HEIC_PREPROCESSING_FAILED]: 'Unable to process HEIC/HEIF file - ensure the file is valid',
  [ERROR_TYPES.UNKNOWN_ERROR]: 'An unexpected error occurred - check the error message for details'
};

/**
 * Determine error type from error object
 * @param {Error} error - The error object
 * @returns {string} Error type constant from ERROR_TYPES enum
 * @example
 * const error = new Error('ENOENT: no such file');
 * error.code = 'ENOENT';
 * const type = getErrorType(error); // Returns ERROR_TYPES.FILE_NOT_FOUND
 */
export function getErrorType(error) {
  // Check system error codes first
  if (error.code && ERROR_CODE_MAP[error.code]) {
    return ERROR_CODE_MAP[error.code];
  }
  
  // Check error message patterns
  const message = error.message || '';
  
  if (message.includes('Input file contains unsupported image format')) {
    return ERROR_TYPES.UNSUPPORTED_FORMAT;
  }
  
  if (message.includes('Input file is missing')) {
    return ERROR_TYPES.FILE_NOT_FOUND;
  }
  
  if (message.includes('unsupported image format')) {
    return ERROR_TYPES.UNSUPPORTED_FORMAT;
  }
  
  if (message.includes('Input buffer contains unsupported image format')) {
    return ERROR_TYPES.UNSUPPORTED_FORMAT;
  }
  
  if (message.includes('Unable to write')) {
    return ERROR_TYPES.WRITE_ERROR;
  }
  
  if (message.includes('metadata')) {
    return ERROR_TYPES.METADATA_ERROR;
  }
  
  if (message.includes('conversion') || message.includes('convert')) {
    return ERROR_TYPES.CONVERSION_FAILED;
  }
  
  if (message.includes('HEIC preprocessing failed')) {
    return ERROR_TYPES.HEIC_PREPROCESSING_FAILED;
  }
  
  return ERROR_TYPES.UNKNOWN_ERROR;
}

/**
 * Format error message with consistent styling and suggestions
 * @param {string} operation - The operation that failed (e.g., 'converting', 'analyzing')
 * @param {string} filePath - The file path involved
 * @param {Error} error - The error object
 * @param {Object} [options={}] - Additional options
 * @param {boolean} [options.showSuggestions=true] - Whether to show suggestions
 * @param {string} [options.prefix='❌'] - Custom prefix for error message
 * @returns {string[]} Array of formatted error message lines
 * @example
 * const lines = formatError('converting', '/path/to/image.jpg', error);
 * lines.forEach(line => console.error(line));
 */
export function formatError(operation, filePath, error, options = {}) {
  const {
    showSuggestions = true,
    prefix = '❌'
  } = options;
  
  const errorType = getErrorType(error);
  const lines = [];
  
  // Main error message
  lines.push(`${prefix} Error ${operation} ${filePath}`);
  lines.push(`   Reason: ${error.message}`);
  
  // Add suggestion if enabled
  if (showSuggestions && ERROR_SUGGESTIONS[errorType]) {
    lines.push(`   💡 ${ERROR_SUGGESTIONS[errorType]}`);
  }
  
  return lines;
}

/**
 * Print formatted error to console
 * @param {string} operation - The operation that failed
 * @param {string} filePath - The file path involved
 * @param {Error} error - The error object
 * @param {Object} [options={}] - Additional options for formatError
 * @returns {void}
 */
export function printError(operation, filePath, error, options = {}) {
  const lines = formatError(operation, filePath, error, options);
  lines.forEach(line => console.error(line));
}

/**
 * Create a standardized error response object
 * @param {string} inputPath - The input file path
 * @param {Error} error - The error object
 * @param {Object} [additionalData={}] - Additional data to include in response
 * @returns {{inputPath: string, error: string, errorType: string, success: boolean}} Standardized error response
 * @example
 * const response = createErrorResponse('/path/to/file.jpg', error, {
 *   processingTime: 1234
 * });
 */
export function createErrorResponse(inputPath, error, additionalData = {}) {
  return {
    inputPath,
    error: error.message,
    errorType: getErrorType(error),
    success: false,
    ...additionalData
  };
}

/**
 * Check if an error is recoverable (batch processing should continue)
 * @param {Error} error - The error object
 * @returns {boolean} Whether the error is recoverable
 * @example
 * if (isRecoverableError(error)) {
 *   console.log('Continuing with next file...');
 * } else {
 *   throw error; // Fatal error, stop processing
 * }
 */
export function isRecoverableError(error) {
  const errorType = getErrorType(error);
  
  // These errors affect only individual files and shouldn't stop batch processing
  const recoverableTypes = [
    ERROR_TYPES.FILE_NOT_FOUND,
    ERROR_TYPES.UNSUPPORTED_FORMAT,
    ERROR_TYPES.CONVERSION_FAILED,
    ERROR_TYPES.METADATA_ERROR,
    ERROR_TYPES.INVALID_INPUT,
    ERROR_TYPES.HEIC_PREPROCESSING_FAILED
  ];
  
  return recoverableTypes.includes(errorType);
}

/**
 * Create a custom error with additional context
 * @param {string} message - Error message
 * @param {string} errorType - Error type constant from ERROR_TYPES
 * @param {Object} [context={}] - Additional context data
 * @returns {Error & {type: string, context: Object}} Enhanced error object
 * @example
 * throw createError(
 *   'Cannot read image metadata',
 *   ERROR_TYPES.METADATA_ERROR,
 *   { filePath: '/path/to/image.jpg' }
 * );
 */
export function createError(message, errorType, context = {}) {
  const error = new Error(message);
  error.type = errorType;
  error.code = errorType; // Also set code for consistency
  error.context = context;
  return error;
}

/**
 * Create error response with timing data
 * @param {string} inputPath - The input file path
 * @param {Error} error - The error object
 * @param {number} processingTime - Processing time in milliseconds
 * @returns {{inputPath: string, error: string, processingTime: number}} Error response with timing
 */
export function createTimedErrorResponse(inputPath, error, processingTime) {
  return {
    inputPath,
    error: error.message,
    processingTime
  };
}

/**
 * Display validation error with consistent formatting
 * @param {string} message - Main error message
 * @param {Object} [context={}] - Additional context to display
 * @param {string[]} [context.suggestions] - Helpful suggestions
 * @param {string[]} [context.examples] - Example usage
 * @param {string} [context.path] - File path involved
 * @param {*} [context.provided] - Value that was provided
 * @returns {void}
 * @example
 * displayValidationError('Quality must be between 1 and 100', {
 *   provided: 150,
 *   suggestions: ['Use a value like 60 or 80'],
 *   examples: ['--quality 80']
 * });
 */
export function displayValidationError(message, context = {}) {
  console.error(`❌ Error: ${message}`);
  
  // Display any additional context fields (excluding suggestions)
  const { suggestions, ...otherContext } = context;
  
  // Show context properties
  Object.entries(otherContext).forEach(([key, value]) => {
    const displayKey = key.replace(/([A-Z])/g, ' $1').toLowerCase();
    console.error(`   ${displayKey}: ${value}`);
  });
  
  // Show suggestions if provided
  if (suggestions && suggestions.length > 0) {
    console.error('   💡 Suggestions:');
    suggestions.forEach(suggestion => {
      console.error(`      - ${suggestion}`);
    });
  }
}