/**
 * @fileoverview Output formatting module for AVIF Image Optimizer
 * 
 * Handles all console output, formatting, and display modes including
 * normal, verbose, quiet, and JSON output modes.
 * 
 * @module output-formatter
 */

import path from 'path';

/**
 * Output modes enum
 * @enum {string}
 * @readonly
 */
export const OUTPUT_MODES = {
  NORMAL: 'normal',
  VERBOSE: 'verbose',
  QUIET: 'quiet',
  JSON: 'json'
};

let currentOutputMode = OUTPUT_MODES.NORMAL;

/**
 * Set the current output mode
 * @param {Object} options - Options object
 * @param {boolean} options.verbose - Enable verbose output
 * @param {boolean} options.quiet - Enable quiet mode
 * @param {boolean} options.json - Enable JSON output
 * @returns {void}
 * @example
 * setOutputMode({ verbose: true, quiet: false, json: false });
 */
export function setOutputMode({ verbose, quiet, json }) {
  if (json) {
    currentOutputMode = OUTPUT_MODES.JSON;
  } else if (quiet) {
    currentOutputMode = OUTPUT_MODES.QUIET;
  } else if (verbose) {
    currentOutputMode = OUTPUT_MODES.VERBOSE;
  } else {
    currentOutputMode = OUTPUT_MODES.NORMAL;
  }
}

/**
 * Get the current output mode
 * @returns {string} Current output mode from OUTPUT_MODES enum
 */
export function getOutputMode() {
  return currentOutputMode;
}

/**
 * Output functions for different modes
 */

/**
 * Output for verbose mode only
 * @param {...any} args - Arguments to output
 * @returns {void}
 */
export function verbose(...args) {
  if (currentOutputMode === OUTPUT_MODES.VERBOSE) {
    console.log(...args);
  }
}

/**
 * Output for normal and verbose modes
 * @param {...any} args - Arguments to output
 * @returns {void}
 */
export function normal(...args) {
  if (currentOutputMode !== OUTPUT_MODES.QUIET && currentOutputMode !== OUTPUT_MODES.JSON) {
    console.log(...args);
  }
}

/**
 * Output for all modes except JSON
 * @param {...any} args - Arguments to output
 * @returns {void}
 */
export function quiet(...args) {
  if (currentOutputMode !== OUTPUT_MODES.JSON) {
    console.log(...args);
  }
}

/**
 * Error output - always shown unless in JSON mode
 * @param {...any} args - Arguments to output
 * @returns {void}
 */
export function error(...args) {
  if (currentOutputMode !== OUTPUT_MODES.JSON) {
    console.error(...args);
  }
}

/**
 * JSON output
 * @param {Object} data - Data to output as JSON
 * @param {boolean} [pretty=true] - Pretty print JSON
 * @returns {void}
 */
export function json(data, pretty = true) {
  if (currentOutputMode === OUTPUT_MODES.JSON) {
    console.log(JSON.stringify(data, null, pretty ? 2 : 0));
  }
}

/**
 * Format bytes to human readable format
 * @param {number} bytes - Number of bytes
 * @param {number} [decimals=1] - Number of decimal places
 * @returns {string} Formatted string (e.g., "1.5KB", "2.3MB")
 * @example
 * formatBytes(1536); // Returns "1.5KB"
 * formatBytes(1048576); // Returns "1MB"
 */
export function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + sizes[i];
}

/**
 * Format time duration
 * @param {number} milliseconds - Duration in milliseconds
 * @returns {string} Formatted time string (e.g., "123.4ms", "1.23s")
 * @example
 * formatTime(500); // Returns "500.0ms"
 * formatTime(1500); // Returns "1.50s"
 */
export function formatTime(milliseconds) {
  if (milliseconds < 1000) {
    return `${milliseconds.toFixed(1)}ms`;
  } else {
    return `${(milliseconds / 1000).toFixed(2)}s`;
  }
}

/**
 * Format percentage
 * @param {number} value - Percentage value
 * @param {number} [decimals=1] - Number of decimal places
 * @returns {string} Formatted percentage (e.g., "75.5%")
 * @example
 * formatPercentage(75.523); // Returns "75.5%"
 */
export function formatPercentage(value, decimals = 1) {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Display the application header
 * @param {Object} config - Configuration object
 * @param {string[]} config.supportedFormats - List of supported formats
 * @param {number} config.maxWidth - Maximum width
 * @param {number} config.maxHeight - Maximum height
 * @param {number} config.quality - Quality setting
 * @param {number} config.effort - Effort level
 * @param {boolean} config.dryRun - Whether in dry run mode
 * @returns {void}
 */
export function displayHeader(config) {
  if (currentOutputMode === OUTPUT_MODES.JSON) return;
  
  normal('🖼️  AVIF Image Optimizer');
  normal('========================');
  normal(`Supported formats: ${config.supportedFormats.join(', ')}`);
  normal(`Max dimensions: ${config.maxWidth}x${config.maxHeight}px`);
  normal(`Quality: ${config.quality}`);
  normal(`Effort: ${config.effort}`);
  
  if (config.dryRun) {
    normal('Mode: Dry run (no files will be written)');
  }
  
  normal('');
}

/**
 * Display file processing progress
 * @param {Object} result - Processing result from convertImageToAvif
 * @param {string} result.inputPath - Input file path
 * @param {string} result.outputPath - Output file path
 * @param {boolean} [result.skipped] - Whether file was skipped
 * @param {string} [result.error] - Error message if failed
 * @param {number} [result.originalSize] - Original file size
 * @param {number} [result.outputSize] - Output file size
 * @param {number} [result.sizeSavings] - Size savings percentage
 * @param {number} [result.processingTime] - Processing time in ms
 * @param {Object} config - Configuration object
 * @param {boolean} config.dryRun - Whether in dry run mode
 * @param {boolean} config.preserveExif - Whether EXIF was preserved
 * @returns {void}
 */
export function displayFileProgress(result, config) {
  if (currentOutputMode === OUTPUT_MODES.JSON) return;
  
  const inputName = path.basename(result.inputPath);
  const outputName = path.basename(result.outputPath);
  
  if (result.skipped) {
    normal(`⚠️  Skipping ${inputName}: output already exists`);
    return;
  }
  
  if (result.error) {
    error(`❌ Error ${config.dryRun ? 'analyzing' : 'converting'} ${result.inputPath}`);
    error(`   Reason: ${result.error}`);
    
    // Add helpful error suggestions
    if (result.errorCode === 'ENOENT') {
      error(`   💡 The file was not found or was deleted during processing`);
    } else if (result.errorCode === 'EACCES') {
      error(`   💡 Permission denied - check file/directory permissions`);
    } else if (result.errorCode === 'ENOSPC') {
      error(`   💡 No space left on device - free up disk space`);
    } else if (result.error.includes('unsupported image format')) {
      error(`   💡 The file format is not supported or the file is corrupted`);
    } else if (result.error.includes('Input file is missing')) {
      error(`   💡 The input file was not found`);
    }
    return;
  }
  
  // Success output
  const emoji = config.dryRun ? '🔎' : '✅';
  const action = config.dryRun ? '→' : '→';
  const metadataInfo = config.preserveExif ? ' with metadata' : '';
  
  normal(`${emoji} ${inputName} ${action} ${outputName}${metadataInfo}`);
  
  // Size information
  const originalKB = (result.originalSize / 1024).toFixed(1);
  const outputKB = (result.outputSize / 1024).toFixed(1);
  const savingsPercent = formatPercentage(result.sizeSavings);
  
  let sizeInfo = `   Size: ${originalKB}KB → ${outputKB}KB (${savingsPercent} savings)`;
  
  // Add dimension change info if resized
  if (result.resized || result.dimensionChange) {
    const dimensionInfo = ` (${result.originalWidth}x${result.originalHeight} → ${result.newWidth}x${result.newHeight})`;
    sizeInfo += dimensionInfo;
  }
  
  normal(sizeInfo);
  
  // Processing time
  const timeLabel = config.dryRun ? 'Analysis time' : 'Processing time';
  normal(`   ${timeLabel}: ${formatTime(result.processingTime)}`);
  
  // Verbose output
  if (currentOutputMode === OUTPUT_MODES.VERBOSE && !config.dryRun) {
    verbose(`   Metadata read: ${formatTime(result.metadataTime)}`);
    verbose(`   Conversion: ${formatTime(result.conversionTime)}`);
    if (result.wasPreprocessed) {
      verbose(`   📱 HEIC/HEIF preprocessing was required`);
    }
  }
}

/**
 * Display conversion summary
 * @param {Object} summary - Summary object
 * @param {Object} summary.stats - Statistics object
 * @param {number} summary.stats.processed - Number of files processed
 * @param {number} summary.stats.skipped - Number of files skipped
 * @param {number} summary.stats.resized - Number of files resized
 * @param {number} summary.stats.totalOriginalSize - Total original size
 * @param {number} summary.stats.totalOutputSize - Total output size
 * @param {number} summary.stats.totalSavingsPercent - Total savings percentage
 * @param {number} summary.stats.totalBatchTime - Total batch time
 * @param {number} summary.stats.averageProcessingTime - Average processing time
 * @param {Array} summary.results - Array of processing results
 * @param {Object} config - Configuration object
 * @param {boolean} config.dryRun - Whether in dry run mode
 * @returns {void}
 */
export function displaySummary(summary, config) {
  if (currentOutputMode === OUTPUT_MODES.JSON) {
    json({ summary: summary.stats, results: summary.results });
    return;
  }
  
  const { stats } = summary;
  
  quiet(config.dryRun ? '\n📊 Dry Run Summary' : '\n📊 Conversion Summary');
  quiet('=====================');
  quiet(`✅ Successfully ${config.dryRun ? 'analyzed' : 'converted'}: ${stats.processed} files`);
  
  if (stats.skipped > 0) {
    quiet(`⏭️  Skipped: ${stats.skipped} files`);
  }
  
  quiet(`📏 Resized images: ${stats.resized} files`);
  
  if (stats.processed > 0) {
    const totalOriginalKB = (stats.totalOriginalSize / 1024).toFixed(1);
    const totalOutputKB = (stats.totalOutputSize / 1024).toFixed(1);
    const totalSavings = formatPercentage(stats.totalSavingsPercent);
    
    quiet(`💾 Total size savings: ${totalOriginalKB}KB → ${totalOutputKB}KB (${totalSavings})`);
    quiet(`🌐 Modern format: All images now use AVIF (93%+ browser support)`);
    quiet(`⏱️  Total batch time: ${formatTime(stats.totalBatchTime)}`);
    quiet(`⚡ Average time per file: ${formatTime(stats.averageProcessingTime)}`);
  }
}

/**
 * Display file discovery results
 * @param {number} fileCount - Number of files found
 * @param {number} excludedCount - Number of files excluded
 * @returns {void}
 */
export function displayFileDiscovery(fileCount, excludedCount) {
  if (currentOutputMode === OUTPUT_MODES.JSON) return;
  
  if (excludedCount > 0) {
    normal(`Excluded ${excludedCount} file(s) based on patterns`);
  }
  
  normal(`Found ${fileCount} image file(s) to process:\n`);
}

/**
 * Display no files found error
 * @param {string} input - Input pattern
 * @param {string[]} supportedFormats - Supported formats
 * @returns {void}
 */
export function displayNoFilesError(input, supportedFormats) {
  if (currentOutputMode === OUTPUT_MODES.JSON) {
    json({ 
      error: 'No supported image files found',
      input: input,
      supportedFormats: supportedFormats 
    });
  } else {
    error('❌ No supported image files found matching the pattern');
    error(`   Input: ${input}`);
    error(`   Supported formats: ${supportedFormats.join(', ')}`);
    error(`\n   💡 Suggestions:`);
    error(`   • Check if the path contains supported image files`);
    error(`   • Use --recursive to search subdirectories`);
    error(`   • Try a different file pattern or directory`);
    error(`   • Verify file extensions match supported formats`);
  }
}

/**
 * Display validation error
 * @param {string} message - Error message
 * @param {Object} [details={}] - Error details
 * @param {string} [details.path] - File path
 * @param {string} [details.originalInput] - Original input
 * @param {*} [details.provided] - Provided value
 * @param {string} [details.reason] - Error reason
 * @param {string[]} [details.examples] - Example usage
 * @param {string[]} [details.suggestions] - Helpful suggestions
 * @returns {void}
 */
export function displayValidationError(message, details = {}) {
  if (currentOutputMode === OUTPUT_MODES.JSON) {
    json({ error: message, ...details });
  } else {
    error(`❌ Error: ${message}`);
    
    if (details.path) {
      error(`   Path: ${details.path}`);
    }
    
    if (details.originalInput) {
      error(`   Original input: ${details.originalInput}`);
    }
    
    if (details.provided !== undefined) {
      error(`   Provided: ${details.provided}`);
    }
    
    if (details.reason) {
      error(`   Reason: ${details.reason}`);
    }
    
    if (details.examples && details.examples.length > 0) {
      error(`   Examples: ${details.examples.join(', ')}`);
    }
    
    if (details.suggestions && details.suggestions.length > 0) {
      error(`\n   💡 Suggestions:`);
      details.suggestions.forEach(suggestion => {
        error(`   • ${suggestion}`);
      });
    }
  }
}

/**
 * ANSI color codes for terminal output
 * @enum {string}
 * @readonly
 */
export const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

/**
 * Apply color to text (only in non-JSON mode)
 * @param {string} text - Text to color
 * @param {string} color - Color code from COLORS enum
 * @returns {string} Colored text with ANSI codes
 * @example
 * colorize('Success!', COLORS.green); // Returns green colored text
 */
export function colorize(text, color) {
  if (currentOutputMode === OUTPUT_MODES.JSON) {
    return text;
  }
  return `${color}${text}${COLORS.reset}`;
}

/**
 * Success message (green)
 * @param {string} text - Text to format
 * @returns {string} Green colored text
 */
export function success(text) {
  return colorize(text, COLORS.green);
}

/**
 * Warning message (yellow)
 * @param {string} text - Text to format
 * @returns {string} Yellow colored text
 */
export function warning(text) {
  return colorize(text, COLORS.yellow);
}

/**
 * Error message (red)
 * @param {string} text - Text to format
 * @returns {string} Red colored text
 */
export function danger(text) {
  return colorize(text, COLORS.red);
}

/**
 * Info message (blue)
 * @param {string} text - Text to format
 * @returns {string} Blue colored text
 */
export function info(text) {
  return colorize(text, COLORS.blue);
}