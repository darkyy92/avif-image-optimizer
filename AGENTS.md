# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Development Commands

```bash
# Install dependencies
npm install

# Test CLI locally
node src/cli.js --help
node src/cli.js <test-image> --quality 80

# Test programmatic API
node -e "import('./src/index.js').then(m => m.optimizeToAvif('./test.jpg'))"
```

## Architecture Overview

This is a dual-interface image optimization tool with both CLI and programmatic APIs built around a single processing core.

### Core Structure
- **`src/cli.js`**: Main executable with CLI interface and core processing functions
- **`src/index.js`**: Programmatic API wrapper that imports and re-exports CLI functions

### Key Processing Pipeline
1. **File Discovery**: `findImageFiles()` uses glob patterns to locate supported formats
2. **Image Processing**: `convertImageToAvif()` handles the Sharp-based conversion pipeline  
3. **Dimension Optimization**: `getOptimizedDimensions()` maintains aspect ratios while respecting size limits
4. **Batch Orchestration**: `optimizeImages()` coordinates the full workflow with progress reporting

### Configuration System
Uses a layered approach: `DEFAULT_CONFIG` → CLI options → programmatic overrides. Key settings include quality (1-100), effort (1-10), max dimensions, and output directory control.

### Dependencies
- **Sharp**: Core image processing (metadata, resizing, AVIF conversion with Lanczos3 kernel)
- **Commander**: CLI argument parsing and help generation  
- **Glob**: File pattern matching with recursive directory support

## Important Implementation Details

### Image Processing Specifics
- Never upscales images (uses `withoutEnlargement: true`)
- Applies AVIF-specific optimizations (4:2:0 chroma subsampling)
- Preserves aspect ratios during resizing calculations
- Uses Lanczos3 kernel for high-quality scaling

### File Handling Patterns
- Supports formats: JPG, JPEG, PNG, WebP, TIFF, TIF
- Creates output directories recursively as needed
- Preserves original files by default (configurable)
- Filters out system directories (.git, node_modules) during discovery

### Error Handling
- Continues batch processing when individual files fail
- Provides detailed error messages with file paths
- Graceful handling of missing files or unsupported formats

## Testing Approach
- Test CLI with various image formats and options
- Verify dimension calculations don't exceed maximums
- Check file size reduction statistics accuracy
- Test recursive directory processing with glob patterns

## Notes for AI Agents
- This tool processes images using the Sharp library for high-performance operations
- The codebase follows ES modules (type: "module" in package.json)
- Both CLI and programmatic interfaces share the same core processing functions
- Configuration is designed to be layered and overrideable at multiple levels