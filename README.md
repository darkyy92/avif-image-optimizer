# AVIF Image Optimizer

> Fast, modern image optimizer that converts JPG, PNG and other formats to AVIF with intelligent resizing and compression.

[![npm version](https://badge.fury.io/js/avif-image-optimizer.svg)](https://badge.fury.io/js/avif-image-optimizer)
[![Node.js CI](https://github.com/darkyy92/avif-image-optimizer/workflows/Node.js%20CI/badge.svg)](https://github.com/darkyy92/avif-image-optimizer/actions)

## ✨ Features

- 🖼️ **Multi-format Support**: JPG, PNG, WebP, TIFF → AVIF conversion
- 📏 **Smart Resizing**: Intelligent resizing with aspect ratio preservation (never upscales)
- 🎯 **Quality Control**: Configurable quality settings optimized for web use
- 📁 **Batch Processing**: Process single files, directories, or glob patterns
- ⚡ **High Performance**: Uses Sharp library for lightning-fast processing
- 📊 **Detailed Reporting**: Shows file size savings and dimension changes
- 🚫 **Exclude Patterns**: Skip files matching glob patterns during batch runs
- 🌐 **Web Optimized**: AVIF format with 93%+ browser support and 50-90% size reduction

## 🚀 Quick Start

### Installation

```bash
# Install globally
npm install -g avif-image-optimizer

# Or install locally in your project
npm install avif-image-optimizer
```

### Basic Usage

```bash
# Convert a single image
avif-optimizer photo.jpg

# Convert all images in a directory
avif-optimizer ./images --recursive

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

#### Examples

```bash
# Convert single file with high quality
avif-optimizer hero-image.jpg --quality 85

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

```html
<picture>
  <source srcset="image.avif" type="image/avif">
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="Fallback for older browsers">
</picture>
```

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

### Permission Errors

```bash
# Make CLI executable (Linux/Mac)
chmod +x ./node_modules/.bin/avif-optimizer

# Or run with node directly
node ./node_modules/avif-image-optimizer/src/cli.js
```

## 🔮 Roadmap

- [ ] **HEIC/HEIF Support** - Convert iPhone photos
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
- AVIF format by [AOMedia](https://aomedia.org/)
- Inspired by the need for modern, efficient web images

---

**Made with ❤️ for the modern web**