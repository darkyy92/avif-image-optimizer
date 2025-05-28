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

// Default configuration
const DEFAULT_CONFIG = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 60,
  effort: 6,
  outputDir: null, // Same directory as input by default
  preserveOriginal: true,
  recursive: false,
  json: false,
  dryRun: false,
  exclude: []
};

/**
 * Supported input formats
 */
const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif'];

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
    
    // Calculate optimized dimensions
    const { width: newWidth, height: newHeight } = getOptimizedDimensions(
      originalWidth,
      originalHeight,
      config.maxWidth,
      config.maxHeight
    );
    
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
    const dimensionChange = originalWidth !== newWidth || originalHeight !== newHeight;

    if (!config.json) {
      const changeInfo = dimensionChange
        ? ` (${originalWidth}x${originalHeight} → ${newWidth}x${newHeight})`
        : '';
      console.log(`✅ ${path.basename(inputPath)} → ${path.basename(outputPath)}`);
      console.log(`   Size: ${(originalSize / 1024).toFixed(1)}KB → ${(outputSize / 1024).toFixed(1)}KB (${sizeSavings}% savings)${changeInfo}`);
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
      resized: dimensionChange
    };
    
  } catch (error) {
    console.error(`❌ Error converting ${inputPath}:`, error.message);
    return null;
  }
}

/**
 * Analyze a single image file without converting (dry run)
 */
async function analyzeImageFile(inputPath, config) {
  try {
    const inputDir = path.dirname(inputPath);
    const inputExt = path.extname(inputPath).toLowerCase();
    const inputName = path.basename(inputPath, inputExt);
    const outputDir = config.outputDir || inputDir;
    const outputPath = path.join(outputDir, `${inputName}.avif`);

    const metadata = await sharp(inputPath).metadata();
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

    console.log(`🔎 ${path.basename(inputPath)} → ${path.basename(outputPath)}`);
    console.log(`   Size: ${(originalSize / 1024).toFixed(1)}KB → ${(estimatedSize / 1024).toFixed(1)}KB (${sizeSavings}% savings)${dimensionChange}`);

    return {
      inputPath,
      outputPath,
      originalSize,
      outputSize: estimatedSize,
      sizeSavings: parseFloat(sizeSavings),
      dimensionChange: dimensionChange !== ''
    };
  } catch (error) {
    console.error(`❌ Error analyzing ${inputPath}:`, error.message);
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
  const config = { ...DEFAULT_CONFIG, ...options };

  if (!config.json) {
    console.log('🖼️  AVIF Image Optimizer');
    console.log('========================');
    console.log(`Supported formats: ${SUPPORTED_FORMATS.join(', ')}`);
    console.log(`Max dimensions: ${config.maxWidth}x${config.maxHeight}px`);
    console.log(`Quality: ${config.quality}`);
    console.log(`Effort: ${config.effort}`);
    if (config.dryRun) {
      console.log('Mode: Dry run (no files will be written)');
    }
    console.log('');
  }
  
  // Find image files
  let imageFiles = await findImageFiles(input, config.recursive);
  const { files: filteredFiles, excludedCount } = applyExclusions(imageFiles, config.exclude);
  imageFiles = filteredFiles;
  if (excludedCount > 0) {
    console.log(`Excluded ${excludedCount} file(s) based on patterns`);
  }

  if (imageFiles.length === 0) {
    if (!config.json) {
      console.log('⚠️  No supported image files found matching the pattern');
      console.log(`   Supported formats: ${SUPPORTED_FORMATS.join(', ')}`);
    } else {
      console.log(JSON.stringify({ error: 'No supported image files found' }));
    }
    return;
  }

  if (!config.json) {
    console.log(`Found ${imageFiles.length} image file(s) to process:\n`);
  }
  // Convert files
  const results = [];
  for (const imageFile of imageFiles) {
    const result = config.dryRun
      ? await analyzeImageFile(imageFile, config)
      : await convertImageToAvif(imageFile, config);
    if (result) {
      results.push(result);
    }
  }
  
  // Summary
  if (results.length > 0) {
<<<<<<< HEAD
    const totalOriginalSize = results.reduce((sum, r) => sum + r.originalSize, 0);
    const totalOutputSize = results.reduce((sum, r) => sum + r.outputSize, 0);
    const totalSavings = ((totalOriginalSize - totalOutputSize) / totalOriginalSize * 100).toFixed(1);
    const resizedCount = results.filter(r => r.resized).length;

    if (!config.json) {
      console.log('\n📊 Conversion Summary');
      console.log('=====================');
      console.log(`✅ Successfully converted: ${results.length} files`);
      console.log(`📏 Resized images: ${resizedCount} files`);
      console.log(`💾 Total size savings: ${(totalOriginalSize / 1024).toFixed(1)}KB → ${(totalOutputSize / 1024).toFixed(1)}KB (${totalSavings}%)`);
      console.log(`🌐 Modern format: All images now use AVIF (93%+ browser support)`);
    } else {
      const summary = {
        converted: results.length,
        resized: resizedCount,
        totalOriginalSize,
        totalOutputSize,
        totalSavings: parseFloat(totalSavings)
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
  .option('-w, --max-width <pixels>', 'Maximum width in pixels', (value) => parseInt(value), DEFAULT_CONFIG.maxWidth)
  .option('-h, --max-height <pixels>', 'Maximum height in pixels', (value) => parseInt(value), DEFAULT_CONFIG.maxHeight)
  .option('-q, --quality <number>', 'AVIF quality (1-100)', (value) => parseInt(value), DEFAULT_CONFIG.quality)
  .option('-e, --effort <number>', 'Compression effort (1-10)', (value) => parseInt(value), DEFAULT_CONFIG.effort)
  .option('-o, --output-dir <path>', 'Output directory (default: same as input)')
  .option('-r, --recursive', 'Search recursively in subdirectories')
<<<<<<< HEAD
  .option('--json', 'Output conversion results as JSON')
=======
  .option('-d, --dry-run', 'Show what files would be processed without converting')
  .option('-x, --exclude <pattern>', 'Glob pattern to exclude (can be used multiple times)', (val, acc) => {
    acc.push(val);
    return acc;
  }, [])
  .option('--no-preserve-original', 'Delete original files after conversion')
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
  $ avif-optimizer ./images --dry-run
  $ avif-optimizer ./images --exclude "*.thumb.*"
  $ avif-optimizer ./images --json > report.json

Supported formats: ${SUPPORTED_FORMATS.join(', ')}
`);

// Run the program
program.parse();

export { optimizeImages, convertImageToAvif, analyzeImageFile };
