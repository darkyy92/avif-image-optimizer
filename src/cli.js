#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { glob } from 'glob';
import { program } from 'commander';

/**
 * AVIF Image Optimizer
 * Converts JPG, PNG and other image formats to AVIF with optimization and resizing
 */

// Default configuration
const DEFAULT_CONFIG = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 60,
  effort: 6,
  outputDir: null, // Same directory as input by default
  preserveOriginal: true,
  recursive: false,
  verbose: false,
  quiet: false
};

/**
 * Supported input formats
 */
const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif'];

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
  try {
    const inputDir = path.dirname(inputPath);
    const inputExt = path.extname(inputPath).toLowerCase();
    const inputName = path.basename(inputPath, inputExt);
    const outputDir = config.outputDir || inputDir;
    const outputPath = path.join(outputDir, `${inputName}.avif`);
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Get image metadata and file size
    const metadata = await sharp(inputPath).metadata();
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
    await sharp(inputPath)
      .resize(newWidth, newHeight, {
        kernel: sharp.kernel.lanczos3,
        withoutEnlargement: true
      })
      .avif({
        quality: config.quality,
        effort: config.effort,
        chromaSubsampling: '4:2:0'
      })
      .toFile(outputPath);
    
    // Get output file size
    const outputStats = fs.statSync(outputPath);
    const outputSize = outputStats.size;
    
    // Calculate savings
    const sizeSavings = ((originalSize - outputSize) / originalSize * 100).toFixed(1);
    const dimensionChange = (originalWidth !== newWidth || originalHeight !== newHeight) 
      ? ` (${originalWidth}x${originalHeight} → ${newWidth}x${newHeight})`
      : '';

    normal(`✅ ${path.basename(inputPath)} → ${path.basename(outputPath)}`);
    normal(`   Size: ${(originalSize / 1024).toFixed(1)}KB → ${(outputSize / 1024).toFixed(1)}KB (${sizeSavings}% savings)${dimensionChange}`);
    
    return {
      inputPath,
      outputPath,
      originalSize,
      outputSize,
      sizeSavings: parseFloat(sizeSavings),
      dimensionChange: dimensionChange !== ''
    };
    
  } catch (error) {
    console.error(`❌ Error converting ${inputPath}:`, error.message);
    return null;
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
 * Main conversion function
 */
async function optimizeImages(input, options) {
  const config = { ...DEFAULT_CONFIG, ...options };

  setOutputMode(config);
  normal('🖼️  AVIF Image Optimizer');
  normal('========================');
  normal(`Supported formats: ${SUPPORTED_FORMATS.join(', ')}`);
  normal(`Max dimensions: ${config.maxWidth}x${config.maxHeight}px`);
  normal(`Quality: ${config.quality}`);
  normal(`Effort: ${config.effort}`);
  normal('');
  
  // Find image files
  const imageFiles = await findImageFiles(input, config.recursive);
  
  if (imageFiles.length === 0) {
    normal('⚠️  No supported image files found matching the pattern');
    normal(`   Supported formats: ${SUPPORTED_FORMATS.join(', ')}`);
    return;
  }

  normal(`Found ${imageFiles.length} image file(s) to convert:\n`);
  
  // Convert files
  const results = [];
  for (const imageFile of imageFiles) {
    const result = await convertImageToAvif(imageFile, config);
    if (result) {
      results.push(result);
    }
  }

  // Summary
  if (results.length > 0) {
    quiet('\n📊 Conversion Summary');
    quiet('=====================');
    
    const totalOriginalSize = results.reduce((sum, r) => sum + r.originalSize, 0);
    const totalOutputSize = results.reduce((sum, r) => sum + r.outputSize, 0);
    const totalSavings = ((totalOriginalSize - totalOutputSize) / totalOriginalSize * 100).toFixed(1);
    const resizedCount = results.filter(r => r.dimensionChange).length;
    
    quiet(`✅ Successfully converted: ${results.length} files`);
    quiet(`📏 Resized images: ${resizedCount} files`);
    quiet(`💾 Total size savings: ${(totalOriginalSize / 1024).toFixed(1)}KB → ${(totalOutputSize / 1024).toFixed(1)}KB (${totalSavings}%)`);
    quiet(`🌐 Modern format: All images now use AVIF (93%+ browser support)`);
  }
}

// CLI Setup
program
  .name('avif-image-optimizer')
  .description('Convert JPG, PNG and other image formats to AVIF with intelligent optimization')
  .version('1.0.0')
  .argument('<input>', 'Input image file, directory, or glob pattern')
  .option('-w, --max-width <pixels>', 'Maximum width in pixels', (value) => parseInt(value), DEFAULT_CONFIG.maxWidth)
  .option('-h, --max-height <pixels>', 'Maximum height in pixels', (value) => parseInt(value), DEFAULT_CONFIG.maxHeight)
  .option('-q, --quality <number>', 'AVIF quality (1-100)', (value) => parseInt(value), DEFAULT_CONFIG.quality)
  .option('-e, --effort <number>', 'Compression effort (1-10)', (value) => parseInt(value), DEFAULT_CONFIG.effort)
  .option('-o, --output-dir <path>', 'Output directory (default: same as input)')
  .option('-r, --recursive', 'Search recursively in subdirectories')
  .option('--no-preserve-original', 'Delete original files after conversion')
  .option('--verbose', 'Enable verbose output')
  .option('--quiet', 'Suppress all output except errors and final summary')
  .action(async (input, options) => {
    try {
      await optimizeImages(input, {
        maxWidth: options.maxWidth,
        maxHeight: options.maxHeight,
        quality: options.quality,
        effort: options.effort,
        outputDir: options.outputDir,
        preserveOriginal: options.preserveOriginal,
        recursive: options.recursive,
        verbose: options.verbose,
        quiet: options.quiet
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
  $ avif-optimizer image.jpg --quiet
  
Supported formats: ${SUPPORTED_FORMATS.join(', ')}
`);

// Run the program
program.parse();

export { optimizeImages, convertImageToAvif };