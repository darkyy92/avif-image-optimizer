# AVIF Image Optimizer

> Fast, modern image optimizer that converts JPG, PNG, HEIC, HEIF and other formats to AVIF with intelligent resizing and compression. Now with parallel processing for blazing-fast batch conversions.

[![npm version](https://badge.fury.io/js/avif-image-optimizer.svg)](https://badge.fury.io/js/avif-image-optimizer)
[![Node.js CI](https://github.com/darkyy92/avif-image-optimizer/workflows/Node.js%20CI/badge.svg)](https://github.com/darkyy92/avif-image-optimizer/actions)

## ✨ Features

- 🖼️ **Multi-format Support**: JPG, PNG, HEIC, HEIF, WebP, TIFF → AVIF conversion
- 🚀 **Parallel Processing**: Multi-core batch processing with configurable concurrency
- 📏 **Smart Resizing**: Intelligent resizing with aspect ratio preservation (never upscales)
- 🎯 **Quality Control**: Configurable quality settings optimized for web use
- 📁 **Batch Processing**: Process single files, directories, or glob patterns
- ⚡ **High Performance**: Uses Sharp library with async operations for lightning-fast processing
- 📊 **Detailed Reporting**: Shows file size savings, dimension changes, and processing times
- 🚫 **Exclude Patterns**: Skip files matching glob patterns during batch runs
- 🌐 **Web Optimized**: AVIF format with 95%+ browser support and 50-90% size reduction
- 🧪 **Fully Tested**: Comprehensive test suite with 60+ tests ensuring reliability
- 🏗️ **Modular Architecture**: Clean, maintainable codebase with separated concerns

## 🚀 Quick Start

### Installation

```bash
# Install globally
npm install -g avif-image-optimizer

# Or install locally in your project
npm install avif-image-optimizer
```

### Basic Usage

**Most Common: Optimize all images in a web project**
```bash
# In your project root - optimizes all images with web-friendly defaults
avif-optimizer . --recursive

# This will:
# - Find all JPG, PNG, WebP, HEIC, etc. in your project (including subdirectories)
# - Convert them to AVIF (50-90% smaller files)
# - Limit dimensions to 1200x1200px (perfect for web) - default
# - Keep your originals safe (as browser fallbacks) - default
# - Use quality 60 (great balance for web) - default
# Note: --recursive is the only flag needed, all other settings are optimized defaults!

# Want AVIF-only files? Add --no-preserve-original
avif-optimizer . --recursive --no-preserve-original
```

**Other common tasks:**
```bash
# Convert a single image
avif-optimizer photo.jpg

# Convert with custom quality
avif-optimizer photo.png --quality 80

# Batch convert with size limit
avif-optimizer "*.{jpg,png}" --max-width 800
```

### Importing in Web Projects

After installing the package locally you can import the ES module directly in
any Node-based build system (Webpack, Vite, Rollup, etc.) or server script:

```javascript
import { optimizeToAvif } from 'avif-image-optimizer';
```

If your project still uses CommonJS modules, use a dynamic import:

```javascript
const { optimizeToAvif } = await import('avif-image-optimizer');
```

## 🌐 Perfect for Web Projects

This tool is designed with web developers in mind. The defaults are specifically chosen for optimal web performance:

- **1200x1200px max dimensions**: Covers most responsive image needs while keeping file sizes manageable
- **Quality 60**: Excellent visual quality with significant file size reduction
- **AVIF format**: 50-90% smaller than JPEG/PNG with better quality
- **Preserves originals**: Safe to run on your source files (keeps JPEGs as fallbacks for older browsers)
- **Parallel processing**: Converts your entire project quickly

**One command to optimize your entire web project:**
```bash
cd your-web-project
avif-optimizer . --recursive
```

That's it! All your images are now optimized for the modern web.

**Pro tip:** Create an alias for your most common use:
```bash
# Add to your .bashrc or .zshrc
alias optimize-images='avif-optimizer . --recursive'

# Then just run:
optimize-images
```

## 📖 Usage

### Command Line Interface

```bash
avif-optimizer <input> [options]
```

#### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--max-width` | `-w` | Maximum width in pixels | 1200 |
| `--max-height` | `-h` | Maximum height in pixels | 1200 |
| `--quality` | `-q` | AVIF quality (1-100) | 60 |
| `--effort` | `-e` | Compression effort (1-10) | 6 |
| `--output-dir` | `-o` | Output directory | Same as input |
| `--recursive` | `-r` | Search subdirectories | false |
| `--json` | | Output conversion results as JSON | false |
| `--exclude` | `-x` | Glob pattern(s) to exclude | None |
| `--no-preserve-original` | | Delete originals after conversion | false |
| `--force` | `-f` | Overwrite existing .avif files without prompting | false |
| `--verbose` | | Enable verbose output | false |
| `--quiet` | | Suppress all output except errors and summary | false |
| `--dry-run` | `-d` | Show files that would be processed without converting | false |
| `--concurrency` | `-c` | Number of parallel conversions (1-32) | CPU cores |
| `--generate-report` | | Generate markdown and JSON conversion reports | false |

### Default Exclusions

The optimizer automatically excludes common web assets that shouldn't be converted to AVIF:

**Excluded Directories:**
- `node_modules/`, `.git/`, `dist/`, `build/`, `.cache/`
- `.next/`, `.nuxt/`, `.output/` (framework build outputs)
- `vendor/`, `bower_components/`, `coverage/`

**Excluded Files:**
- **Favicons**: `favicon.ico`, `favicon*.png`
- **Touch Icons**: `apple-touch-icon*.png`
- **PWA Icons**: `icon-*.png`, `maskable-icon*.png`, `android-chrome-*.png`
- **Social Media**: `og-image.png`, `twitter-image.png`, `opengraph-image.jpg`
- **Splash Screens**: `splash-*.png`, `launch-*.png`
- **Other**: SVG files (`logo.svg`, `sprite.svg`)

These exclusions ensure that essential web assets remain in their original format for compatibility. You can override or add to these exclusions using the `--exclude` option.

#### Examples

```bash
# Convert single file with high quality
avif-optimizer hero-image.jpg --quality 85

# Convert iPhone photos (HEIC) to AVIF
avif-optimizer iphone-photo.heic --quality 80

# Convert HEIF files to AVIF
avif-optimizer camera-photo.heif --quality 85

# Convert directory recursively with size limit
avif-optimizer ./photos --recursive --max-width 1920

# Convert to specific output directory
avif-optimizer ./images --output-dir ./optimized --recursive

# Convert with custom compression (faster, larger files)
avif-optimizer batch/*.png --effort 3

# Convert without preserving originals
avif-optimizer temp-images/ --no-preserve-original

# Overwrite existing AVIF files
avif-optimizer ./images --force

# Suppress output except final summary
avif-optimizer photo.jpg --quiet

# Generate JSON report
avif-optimizer ./images --json

# Preview changes without writing output
avif-optimizer ./images --dry-run

# Exclude thumbnail files
avif-optimizer ./images --exclude "*.thumb.*"

# Process with maximum parallelism
avif-optimizer ./large-gallery --recursive --concurrency 16

# Process with limited parallelism (good for shared systems)
avif-optimizer ./photos --recursive --concurrency 4

# Convert and delete originals (AVIF-only, no fallbacks)
avif-optimizer ./images --recursive --no-preserve-original

# Safe way: test with dry-run first
avif-optimizer ./images --recursive --no-preserve-original --dry-run

# Generate detailed conversion reports
avif-optimizer ./project --recursive --generate-report
```

### Programmatic API

```javascript
import { optimizeToAvif, batchConvert, convertImageToAvif } from 'avif-image-optimizer';

// Quick optimization with defaults
await optimizeToAvif('./images');

// Custom configuration
await optimizeToAvif('./photos', {
  quality: 80,
  maxWidth: 1920,
  outputDir: './optimized'
});

// Convert single file
const result = await convertImageToAvif('./photo.jpg', {
  quality: 70,
  maxWidth: 1200
});

// Batch convert array of files
const results = await batchConvert([
  './img1.jpg',
  './img2.png',
  './img3.webp'
], { quality: 65 });
```

## 🎨 Supported Formats

| Input Format | Extension | Notes |
|--------------|-----------|-------|
| JPEG | `.jpg`, `.jpeg` | Most common web format |
| PNG | `.png` | Lossless, transparency support |
| HEIC | `.heic` | Apple's modern format (iPhone photos) |
| HEIF | `.heif` | High Efficiency Image Format |
| WebP | `.webp` | Modern format, good compression |
| TIFF | `.tiff`, `.tif` | High-quality, uncompressed |

**Output:** All formats convert to `.avif` with optimal compression.

## 📊 Performance Benefits

### File Size Comparison

| Original Format | Typical Size | AVIF Size | Savings |
|-----------------|--------------|-----------|---------|
| JPEG (high quality) | 500KB | 150KB | 70% |
| PNG (photo) | 2.5MB | 200KB | 92% |
| PNG (graphics) | 800KB | 120KB | 85% |
| WebP | 400KB | 120KB | 70% |

### Real-World Example

```
Original: photo.jpg (2,048×1,536px, 1.2MB)
Optimized: photo.avif (1,200×900px, 89KB)
Result: 92.6% size reduction, perfect quality
```

### Processing Speed (v1.1.0+)

With parallel processing, batch conversions are significantly faster:

| Files | Sequential | Parallel (4 cores) | Speed Improvement |
|-------|-----------|--------------------|-------------------|
| 10 | 8.2s | 2.3s | 3.6x faster |
| 50 | 41.0s | 11.5s | 3.6x faster |
| 100 | 82.0s | 23.0s | 3.6x faster |

The `--concurrency` option automatically detects your CPU cores for optimal performance.

## 🔧 Quality Settings Guide

| Quality | Use Case | File Size | Visual Quality |
|---------|----------|-----------|----------------|
| 30-40 | Thumbnails, backgrounds | Smallest | Good |
| 50-60 | General web images | Balanced | Excellent |
| 70-80 | Hero images, portfolios | Larger | Outstanding |
| 85-95 | Professional photography | Largest | Perfect |

## 🌐 Browser Support

AVIF is supported by **95%+ of browsers** (as of 2025):

- ✅ Chrome 85+
- ✅ Firefox 93+  
- ✅ Safari 16.1+
- ✅ Edge 121+

### Implementation in HTML

Since the tool preserves your original files by default, you can use the modern `<picture>` element for progressive enhancement:

```html
<picture>
  <source srcset="image.avif" type="image/avif">
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="Fallback for older browsers">
</picture>
```

This ensures maximum compatibility while serving optimized AVIF to modern browsers. If you want AVIF-only files (no fallbacks), use the `--no-preserve-original` flag.

## 📄 Conversion Reports

Generate detailed reports to track conversions and update your codebase:

```bash
avif-optimizer . --recursive --generate-report
```

This creates two report files:
- `avif-report-[timestamp].md` - Human-readable markdown report
- `avif-report-[timestamp].json` - Machine-readable JSON for automation

### Report Contents

The markdown report includes:
- **Summary statistics** - Total files, size savings, processing time
- **Conversion details** - Table of all converted files with sizes
- **Code migration guide** - Framework-specific code examples
- **Search patterns** - Regex patterns to find image references
- **File checklist** - Which files in your project need updating

### Using Reports with AI Agents

Perfect for updating your codebase with AI assistance:

```bash
# 1. Generate report
avif-optimizer . --recursive --generate-report

# 2. Share report with Claude/ChatGPT:
"Update all image references in my codebase using this AVIF conversion report. 
Use picture elements for HTML and appropriate patterns for React/Vue/CSS."
```

The report provides all file mappings and code patterns needed for a complete migration.

## 🛠️ Advanced Usage

### Batch Processing Large Directories

```bash
# Process thousands of images with progress
find ./massive-photo-library -name "*.jpg" -exec avif-optimizer {} \;

# Or use the recursive option
avif-optimizer ./massive-photo-library --recursive --effort 4
```

### Integration with Build Systems

```javascript
// webpack.config.js
import { optimizeToAvif } from 'avif-image-optimizer';

export default {
  // ... your webpack config
  plugins: [
    {
      apply: (compiler) => {
        compiler.hooks.afterEmit.tapAsync('AVIFOptimizer', async (compilation, callback) => {
          await optimizeToAvif('./dist/images');
          callback();
        });
      }
    }
  ]
};
```

### Custom Processing Pipeline

```javascript
import { convertImageToAvif, SUPPORTED_FORMATS } from 'avif-image-optimizer';
import { glob } from 'glob';

// Process images with custom logic
const files = await glob('./src/**/*.{jpg,png}');
const results = [];

for (const file of files) {
  // Apply different settings based on image type
  const isHeroImage = file.includes('hero');
  const quality = isHeroImage ? 85 : 60;
  const maxWidth = isHeroImage ? 1920 : 1200;
  
  const result = await convertImageToAvif(file, {
    quality,
    maxWidth,
    outputDir: './optimized'
  });
  
  results.push(result);
}

console.log(`Optimized ${results.length} images`);
```

## 🚨 Troubleshooting

### Sharp Installation Issues

If Sharp fails to install:

```bash
# Clear npm cache
npm cache clean --force

# Reinstall Sharp
npm uninstall sharp
npm install sharp

# For Apple Silicon Macs
npm install --platform=darwin --arch=arm64 sharp
```

### Memory Issues with Large Images

For very large images:

```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" avif-optimizer huge-image.tif
```

### HEIC/HEIF Processing Performance

HEIC and HEIF files require preprocessing before conversion to AVIF using the `heic-convert` library:

- **Processing time**: HEIC/HEIF files take longer to process due to pure JavaScript decoding (not native like Sharp)
- **Memory usage**: May require more memory for large HEIC files (especially from newer iPhones with 48MP+ photos)
- **Quality**: No quality loss during preprocessing - files are converted to JPEG intermediary format before AVIF conversion
- **Compatibility**: Works with all HEIC/HEIF files including those from iPhones, modern cameras, and other devices
- **Library**: Uses [heic-convert](https://github.com/catdad-experiments/heic-convert) for HEIC/HEIF decoding

### Permission Errors

```bash
# Make CLI executable (Linux/Mac)
chmod +x ./node_modules/.bin/avif-optimizer

# Or run with node directly
node ./node_modules/avif-image-optimizer/src/cli.js
```

## 🏗️ Architecture

The codebase follows a modular architecture for maintainability and testability:

```
src/
├── cli.js              # CLI entry point and argument parsing
├── index.js            # Programmatic API exports
├── constants.js        # Shared configuration and constants
├── validation.js       # Input validation functions
├── image-processor.js  # Core image processing logic
├── parallel-processor.js # Parallel processing implementation
├── error-handler.js    # Centralized error handling
└── output-formatter.js # Output formatting and display logic
```

### Key Design Decisions

- **Modular Structure**: Each module has a single responsibility
- **Async Operations**: All file I/O uses async/await for better performance
- **Parallel Processing**: Configurable concurrency for batch operations
- **Type Safety**: JSDoc annotations throughout for better IDE support
- **Error Recovery**: Graceful error handling that continues batch processing

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Type check JSDoc annotations
npm run typecheck
```

The project includes 60+ tests covering:
- Input validation
- Image processing logic
- Parallel processing
- Error handling
- File operations

## 🔮 Roadmap

- [x] **HEIC/HEIF Support** - Convert iPhone photos
- [x] **Parallel Processing** - Multi-core batch processing for speed
- [x] **Comprehensive Testing** - Full test coverage with Jest
- [x] **Modular Architecture** - Clean, maintainable codebase
- [ ] **Batch Processing UI** - Web interface for bulk conversion
- [ ] **Progressive AVIF** - Generate multiple sizes for responsive images
- [ ] **Metadata Preservation** - Keep EXIF data when needed
- [ ] **Custom Presets** - Save quality/size configurations
- [ ] **Docker Image** - Containerized processing

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Sharp](https://sharp.pixelplumbing.com/) - High performance image processing
- HEIC/HEIF support via [heic-convert](https://github.com/catdad-experiments/heic-convert) - Pure JavaScript HEIC decoder
- AVIF format by [AOMedia](https://aomedia.org/)
- Inspired by the need for modern, efficient web images

---

**Made with ❤️ for the modern web**