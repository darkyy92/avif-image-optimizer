#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { glob } from 'glob';
import { minimatch } from 'minimatch';
import { program } from 'commander';

/**
 * AVIF Image Optimizer
 * Converts JPG, PNG and other image formats to AVIF with optimization and resizing
 */

/**
 * Validation Functions
 */

/**
 * Validate numeric range with helpful error messages
 */
function validateNumericRange(value, min, max, paramName, examples = []) {
  const num = parseInt(value);
  
  if (isNaN(num)) {
    console.error(`❌ Error: ${paramName} must be a number`);
    if (examples.length > 0) {
      console.error(`   Examples: ${examples.join(', ')}`);
    }
    process.exit(1);
  }
  
  if (num < min || num > max) {
    console.error(`❌ Error: ${paramName} must be between ${min} and ${max}`);
    console.error(`   Provided: ${num}`);
    if (examples.length > 0) {
      console.error(`   Examples: ${examples.join(', ')}`);
    }
    process.exit(1);
  }
  
  return num;
}

/**
 * Validate quality parameter (1-100)
 */
function validateQuality(value) {
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
 */
function validateEffort(value) {
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
 */
function validateInputExists(inputPath) {
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
      console.error(`❌ Error: Input path does not exist`);
      console.error(`   Path: ${resolvedPath}`);
      console.error(`   Original input: ${inputPath}`);
      console.error(`\n   💡 Suggestions:`);
      console.error(`   • Check if the path is spelled correctly`);
      console.error(`   • Use quotes around paths with spaces: "my folder/image.jpg"`);
      console.error(`   • For glob patterns, ensure the base directory exists`);
      console.error(`   • Use relative paths from current directory or absolute paths`);
      process.exit(1);
    } else {
      console.error(`❌ Error: Cannot access input path: ${error.message}`);
      console.error(`   Path: ${resolvedPath}`);
      process.exit(1);
    }
  }
}

/**
 * Validate output directory writability
 */
function validateOutputDirectory(outputDir) {
  if (!outputDir) {
    return; // Will use input directory, validated later
  }
  
  const resolvedPath = path.resolve(outputDir);
  
  try {
    // Check if directory exists
    if (fs.existsSync(resolvedPath)) {
      const stats = fs.statSync(resolvedPath);
      
      if (!stats.isDirectory()) {
        console.error(`❌ Error: Output path exists but is not a directory`);
        console.error(`   Path: ${resolvedPath}`);
        console.error(`\n   💡 Please specify a directory path for output`);
        process.exit(1);
      }
      
      // Test writability by trying to create a temporary file
      const testFile = path.join(resolvedPath, '.avif-optimizer-test');
      try {
        fs.writeFileSync(testFile, '');
        fs.unlinkSync(testFile);
      } catch (writeError) {
        console.error(`❌ Error: Cannot write to output directory`);
        console.error(`   Path: ${resolvedPath}`);
        console.error(`   Reason: ${writeError.message}`);
        console.error(`\n   💡 Suggestions:`);
        console.error(`   • Check directory permissions`);
        console.error(`   • Try running with appropriate permissions`);
        console.error(`   • Ensure the directory is not read-only`);
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
        console.error(`❌ Error: Cannot create output directory`);
        console.error(`   Path: ${resolvedPath}`);
        console.error(`   Reason: ${createError.message}`);
        console.error(`\n   💡 Suggestions:`);
        console.error(`   • Check parent directory permissions`);
        console.error(`   • Ensure parent directories exist`);
        console.error(`   • Try using an absolute path`);
        process.exit(1);
      }
    }
  } catch (error) {
    console.error(`❌ Error: Cannot access output directory`);
    console.error(`   Path: ${resolvedPath}`);
    console.error(`   Reason: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Validate dimensions parameters
 */
function validateDimensions(width, height) {
  if (width !== undefined) {
    const w = validateNumericRange(
      width, 
      1, 
      50000, 
      'Max width', 
      ['--max-width 800', '--max-width 1200', '--max-width 1920']
    );
    if (w < 1) {
      console.error(`❌ Error: Max width must be at least 1 pixel`);
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
      console.error(`❌ Error: Max height must be at least 1 pixel`);
      process.exit(1);
    }
  }
}

// Default configuration
const DEFAULT_CONFIG = {
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
 * Supported input formats
 */
const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif'];

/**
 * Timing utility functions for high precision measurement
 */
function startTimer() {
  return process.hrtime.bigint();
}

function endTimer(startTime) {
  const endTime = process.hrtime.bigint();
  const duration = endTime - startTime;
  return Number(duration) / 1000000; // Convert nanoseconds to milliseconds
}

function formatTime(milliseconds) {
  if (milliseconds < 1000) {
    return `${milliseconds.toFixed(1)}ms`;
  } else {
    return `${(milliseconds / 1000).toFixed(2)}s`;
  }
}

// Output mode handling
let outputMode = 'normal';

function setOutputMode({ verbose, quiet }) {
  if (quiet) {
    outputMode = 'quiet';
  } else if (verbose) {
    outputMode = 'verbose';
  } else {
    outputMode = 'normal';
  }
}

function verbose(...args) {
  if (outputMode === 'verbose') {
    console.log(...args);
  }
}

function normal(...args) {
  if (outputMode !== 'quiet') {
    console.log(...args);
  }
}

function quiet(...args) {
  console.log(...args);
}

/**
 * Get optimized dimensions while maintaining aspect ratio
 */
function getOptimizedDimensions(width, height, maxWidth, maxHeight) {
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
 * Convert a single image file to AVIF
 */
async function convertImageToAvif(inputPath, config) {
  const overallStartTime = startTimer();
  
  try {
    const inputDir = path.dirname(inputPath);
    const inputExt = path.extname(inputPath).toLowerCase();
    const inputName = path.basename(inputPath, inputExt);
    const outputDir = config.outputDir || inputDir;
    const outputPath = path.join(outputDir, `${inputName}.avif`);

    // Skip if output exists and not forcing
    if (fs.existsSync(outputPath) && !config.force) {
      if (!config.json) {
        normal(`⚠️  Skipping ${path.basename(inputPath)}: output already exists`);
      }
      return { skipped: true };
    }

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Get image metadata and file size
    const metadataStartTime = startTimer();
    const metadata = await sharp(inputPath).metadata();
    const metadataTime = endTimer(metadataStartTime);
    
    const { width: originalWidth, height: originalHeight } = metadata;
    const originalStats = fs.statSync(inputPath);
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
    const conversionStartTime = startTimer();
    const sharpInstance = sharp(inputPath)
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
    const conversionTime = endTimer(conversionStartTime);
    
    // Get output file size
    const outputStats = fs.statSync(outputPath);
    const outputSize = outputStats.size;
    
    // Calculate savings and total processing time
    const sizeSavings = ((originalSize - outputSize) / originalSize * 100).toFixed(1);
    const dimensionChange = originalWidth !== newWidth || originalHeight !== newHeight;
    const totalProcessingTime = endTimer(overallStartTime);

    if (!config.json) {
      const changeInfo = dimensionChange
        ? ` (${originalWidth}x${originalHeight} → ${newWidth}x${newHeight})`
        : '';
      const metadataInfo = config.preserveExif ? ' with metadata' : '';
      normal(`✅ ${path.basename(inputPath)} → ${path.basename(outputPath)}${metadataInfo}`);
      normal(`   Size: ${(originalSize / 1024).toFixed(1)}KB → ${(outputSize / 1024).toFixed(1)}KB (${sizeSavings}% savings)${changeInfo}`);
      normal(`   Processing time: ${formatTime(totalProcessingTime)}`);
    }

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
      skipped: false,
      processingTime: totalProcessingTime,
      metadataTime,
      conversionTime
    };
    
  } catch (error) {
    const totalProcessingTime = endTimer(overallStartTime);
    console.error(`❌ Error converting ${inputPath}`);
    console.error(`   Reason: ${error.message}`);
    
    // Provide specific suggestions based on error type
    if (error.code === 'ENOENT') {
      console.error(`   💡 The file was not found or was deleted during processing`);
    } else if (error.code === 'EACCES') {
      console.error(`   💡 Permission denied - check file/directory permissions`);
    } else if (error.code === 'ENOSPC') {
      console.error(`   💡 No space left on device - free up disk space`);
    } else if (error.message.includes('Input file contains unsupported image format')) {
      console.error(`   💡 The file format is not supported or the file is corrupted`);
    } else if (error.message.includes('Input file is missing')) {
      console.error(`   💡 The input file was not found`);
    }
    
    return {
      inputPath,
      error: error.message,
      processingTime: totalProcessingTime
    };
  }
}

/**
 * Analyze a single image file without converting (dry run)
 */
async function analyzeImageFile(inputPath, config) {
  const overallStartTime = startTimer();
  
  try {
    const inputDir = path.dirname(inputPath);
    const inputExt = path.extname(inputPath).toLowerCase();
    const inputName = path.basename(inputPath, inputExt);
    const outputDir = config.outputDir || inputDir;
    const outputPath = path.join(outputDir, `${inputName}.avif`);

    const metadataStartTime = startTimer();
    const metadata = await sharp(inputPath).metadata();
    const metadataTime = endTimer(metadataStartTime);
    
    const { width: originalWidth, height: originalHeight } = metadata;
    const originalStats = fs.statSync(inputPath);
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
    
    const totalProcessingTime = endTimer(overallStartTime);

    if (!config.json) {
      const metadataInfo = config.preserveExif ? ' with metadata' : '';
      normal(`🔎 ${path.basename(inputPath)} → ${path.basename(outputPath)}${metadataInfo}`);
      normal(`   Size: ${(originalSize / 1024).toFixed(1)}KB → ${(estimatedSize / 1024).toFixed(1)}KB (${sizeSavings}% savings)${dimensionChange}`);
      normal(`   Analysis time: ${formatTime(totalProcessingTime)}`);
    }

    return {
      inputPath,
      outputPath,
      originalSize,
      outputSize: estimatedSize,
      sizeSavings: parseFloat(sizeSavings),
      dimensionChange: dimensionChange !== '',
      preserveExif: config.preserveExif,
      processingTime: totalProcessingTime,
      metadataTime
    };
  } catch (error) {
    const totalProcessingTime = endTimer(overallStartTime);
    console.error(`❌ Error analyzing ${inputPath}`);
    console.error(`   Reason: ${error.message}`);
    
    // Provide specific suggestions based on error type
    if (error.code === 'ENOENT') {
      console.error(`   💡 The file was not found or was deleted during processing`);
    } else if (error.code === 'EACCES') {
      console.error(`   💡 Permission denied - check file/directory permissions`);
    } else if (error.message.includes('Input file contains unsupported image format')) {
      console.error(`   💡 The file format is not supported or the file is corrupted`);
    } else if (error.message.includes('Input file is missing')) {
      console.error(`   💡 The input file was not found`);
    }
    
    return {
      inputPath,
      error: error.message,
      processingTime: totalProcessingTime
    };
  }
}

/**
 * Find supported image files based on pattern
 */
async function findImageFiles(pattern, recursive) {
  const globOptions = { 
    ignore: ['node_modules/**', '.git/**'],
    nodir: true 
  };
  
  let searchPattern = pattern;
  
  // If pattern doesn't contain supported extensions, add them
  const hasExtension = SUPPORTED_FORMATS.some(ext => 
    searchPattern.toLowerCase().includes(ext)
  );
  
  if (!hasExtension) {
    const extensionPattern = `*.{${SUPPORTED_FORMATS.map(ext => ext.slice(1)).join(',')}}`;
    searchPattern = recursive 
      ? path.join(searchPattern, '**', extensionPattern)
      : path.join(searchPattern, extensionPattern);
  }
  
  const files = await glob(searchPattern, globOptions);
  return files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return SUPPORTED_FORMATS.includes(ext);
  });
}

/**
 * Filter files using exclusion glob patterns
 */
function applyExclusions(files, patterns) {
  if (!patterns || patterns.length === 0) {
    return { files, excludedCount: 0 };
  }

  let excludedCount = 0;
  const filtered = files.filter(file => {
    const isExcluded = patterns.some(pattern => minimatch(file, pattern, { matchBase: true }));
    if (isExcluded) excludedCount++;
    return !isExcluded;
  });

  return { files: filtered, excludedCount };
}

/**
 * Main conversion function
 */
async function optimizeImages(input, options) {
  const batchStartTime = startTimer();
  const config = { ...DEFAULT_CONFIG, ...options };

  setOutputMode(config);
  
  if (!config.json) {
    normal('🖼️  AVIF Image Optimizer');
    normal('========================');
    normal(`Supported formats: ${SUPPORTED_FORMATS.join(', ')}`);
    normal(`Max dimensions: ${config.maxWidth}x${config.maxHeight}px`);
    normal(`Quality: ${config.quality}`);
    normal(`Effort: ${config.effort}`);
    if (config.dryRun) {
      normal('Mode: Dry run (no files will be written)');
    }
    normal('');
  }
  
  // Find image files
  let imageFiles = await findImageFiles(input, config.recursive);
  const { files: filteredFiles, excludedCount } = applyExclusions(imageFiles, config.exclude);
  imageFiles = filteredFiles;
  if (excludedCount > 0 && !config.json) {
    normal(`Excluded ${excludedCount} file(s) based on patterns`);
  }

  if (imageFiles.length === 0) {
    if (!config.json) {
      console.error('❌ No supported image files found matching the pattern');
      console.error(`   Input: ${input}`);
      console.error(`   Supported formats: ${SUPPORTED_FORMATS.join(', ')}`);
      console.error(`\n   💡 Suggestions:`);
      console.error(`   • Check if the path contains supported image files`);
      console.error(`   • Use --recursive to search subdirectories`);
      console.error(`   • Try a different file pattern or directory`);
      console.error(`   • Verify file extensions match supported formats`);
    } else {
      console.log(JSON.stringify({ 
        error: 'No supported image files found',
        input: input,
        supportedFormats: SUPPORTED_FORMATS 
      }));
    }
    process.exit(1);
  }

  if (!config.json) {
    normal(`Found ${imageFiles.length} image file(s) to process:\n`);
  }
  
  // Convert files
  const results = [];
  let skippedCount = 0;
  for (const imageFile of imageFiles) {
    const result = config.dryRun
      ? await analyzeImageFile(imageFile, config)
      : await convertImageToAvif(imageFile, config);
    if (result) {
      if (result.skipped) {
        skippedCount++;
      } else {
        results.push(result);
      }
    }
  }

  const totalBatchTime = endTimer(batchStartTime);

  // Summary
  if (results.length > 0 || skippedCount > 0) {
    const totalOriginalSize = results.reduce((sum, r) => sum + r.originalSize, 0);
    const totalOutputSize = results.reduce((sum, r) => sum + r.outputSize, 0);
    const totalSavings = totalOriginalSize > 0 
      ? ((totalOriginalSize - totalOutputSize) / totalOriginalSize * 100).toFixed(1)
      : '0';
    const resizedCount = results.filter(r => r.resized || r.dimensionChange).length;
    
    // Calculate timing statistics
    const totalProcessingTime = results.reduce((sum, r) => sum + (r.processingTime || 0), 0);
    const averageProcessingTime = results.length > 0 ? totalProcessingTime / results.length : 0;

    if (!config.json) {
      quiet(config.dryRun ? '\n📊 Dry Run Summary' : '\n📊 Conversion Summary');
      quiet('=====================');
      quiet(`✅ Successfully ${config.dryRun ? 'analyzed' : 'converted'}: ${results.length} files`);
      if (skippedCount > 0) {
        quiet(`⏭️  Skipped: ${skippedCount} files`);
      }
      quiet(`📏 Resized images: ${resizedCount} files`);
      if (results.length > 0) {
        quiet(`💾 Total size savings: ${(totalOriginalSize / 1024).toFixed(1)}KB → ${(totalOutputSize / 1024).toFixed(1)}KB (${totalSavings}%)`);
        quiet(`🌐 Modern format: All images now use AVIF (93%+ browser support)`);
        quiet(`⏱️  Total batch time: ${formatTime(totalBatchTime)}`);
        quiet(`⚡ Average time per file: ${formatTime(averageProcessingTime)}`);
      }
    } else {
      const summary = {
        [config.dryRun ? 'analyzed' : 'converted']: results.length,
        skipped: skippedCount,
        resized: resizedCount,
        totalOriginalSize,
        totalOutputSize,
        totalSavings: parseFloat(totalSavings),
        totalBatchTime,
        totalProcessingTime,
        averageProcessingTime
      };
      console.log(JSON.stringify({ summary, results }, null, 2));
    }
  }
}

// CLI Setup
program
  .name('avif-image-optimizer')
  .description('Convert JPG, PNG and other image formats to AVIF with intelligent optimization')
  .version('1.0.0')
  .argument('<input>', 'Input image file, directory, or glob pattern')
  .option('-w, --max-width <pixels>', 'Maximum width in pixels', (value) => validateNumericRange(value, 1, 50000, 'Max width', ['--max-width 800', '--max-width 1200', '--max-width 1920']), DEFAULT_CONFIG.maxWidth)
  .option('-h, --max-height <pixels>', 'Maximum height in pixels', (value) => validateNumericRange(value, 1, 50000, 'Max height', ['--max-height 600', '--max-height 1200', '--max-height 1080']), DEFAULT_CONFIG.maxHeight)
  .option('-q, --quality <number>', 'AVIF quality (1-100)', validateQuality, DEFAULT_CONFIG.quality)
  .option('-e, --effort <number>', 'Compression effort (1-10)', validateEffort, DEFAULT_CONFIG.effort)
  .option('-o, --output-dir <path>', 'Output directory (default: same as input)')
  .option('-r, --recursive', 'Search recursively in subdirectories')
  .option('-f, --force', 'Overwrite existing .avif files without prompting')
  .option('--json', 'Output conversion results as JSON')
  .option('-d, --dry-run', 'Show what files would be processed without converting')
  .option('-x, --exclude <pattern>', 'Glob pattern to exclude (can be used multiple times)', (val, acc) => {
    acc.push(val);
    return acc;
  }, [])
  .option('--no-preserve-original', 'Delete original files after conversion')
  .option('--preserve-exif', 'Preserve EXIF metadata in converted images (increases file size)')
  .option('--verbose', 'Enable verbose output')
  .option('--quiet', 'Suppress all output except errors and final summary')
  .action(async (input, options) => {
    try {
      // Validate input path existence
      validateInputExists(input);
      
      // Validate output directory if specified
      validateOutputDirectory(options.outputDir);
      
      await optimizeImages(input, {
        maxWidth: options.maxWidth,
        maxHeight: options.maxHeight,
        quality: options.quality,
        effort: options.effort,
        outputDir: options.outputDir,
        preserveOriginal: options.preserveOriginal,
        preserveExif: options.preserveExif || DEFAULT_CONFIG.preserveExif,
        recursive: options.recursive,
        force: options.force,
        verbose: options.verbose,
        quiet: options.quiet,
        json: options.json || false,
        dryRun: options.dryRun,
        exclude: options.exclude
      });
    } catch (error) {
      console.error('❌ Optimization failed:', error.message);
      process.exit(1);
    }
  });

// Add example usage
program.addHelpText('after', `
Examples:
  $ avif-optimizer image.jpg
  $ avif-optimizer photo.png --quality 80
  $ avif-optimizer ./images --recursive
  $ avif-optimizer "*.{jpg,png}" --max-width 800
  $ avif-optimizer ./photos --output-dir ./optimized
  $ avif-optimizer ./images --force
  $ avif-optimizer image.jpg --quiet
  $ avif-optimizer ./images --dry-run
  $ avif-optimizer ./images --exclude "*.thumb.*"
  $ avif-optimizer ./images --preserve-exif
  $ avif-optimizer ./images --json > report.json

Supported formats: ${SUPPORTED_FORMATS.join(', ')}
`);

// Run the program
program.parse();

export { optimizeImages, convertImageToAvif, analyzeImageFile };