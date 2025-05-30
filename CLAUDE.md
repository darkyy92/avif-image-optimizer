# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install dependencies
npm install

# Run tests
npm test                    # Run all tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Generate coverage report
npm run typecheck          # Type check JSDoc annotations

# Test CLI locally
node src/cli.js --help
node src/cli.js test-images/file_example_JPG_500kB.jpg --quality 80
node src/cli.js test-images/file_example_HEIC_2MB.heic --quality 85  # HEIC support

# Test with different formats
node src/cli.js test-images/ --recursive --concurrency 4
node src/cli.js test-images/file_example_PNG_500kB.png --max-width 800

# Test programmatic API
node -e "import('./src/index.js').then(m => m.optimizeToAvif('test-images/', { concurrency: 8 }))"
```

## Architecture Overview

This is a modular image optimization tool with parallel processing support, offering both CLI and programmatic APIs.

### Module Structure
- **`src/cli.js`**: CLI entry point with argument parsing
- **`src/index.js`**: Programmatic API exports
- **`src/constants.js`**: Shared configuration and constants
- **`src/validation.js`**: Input validation functions
- **`src/image-processor.js`**: Core image processing logic (async operations)
- **`src/parallel-processor.js`**: Parallel batch processing with configurable concurrency
- **`src/error-handler.js`**: Centralized error handling with recovery
- **`src/output-formatter.js`**: Output formatting and display logic

### Key Processing Pipeline
1. **File Discovery**: `findImageFilesWithExclusions()` uses glob patterns with built-in exclusion
2. **Parallel Processing**: `processInParallel()` handles concurrent conversions using CPU cores
3. **Image Processing**: `convertImageToAvif()` handles Sharp-based conversion (async)
4. **HEIC Preprocessing**: Automatic HEIC/HEIF to JPEG conversion before AVIF
5. **Dimension Optimization**: `getOptimizedDimensions()` maintains aspect ratios
6. **Error Recovery**: Batch processing continues despite individual failures

### Configuration System
Centralized in `constants.js`: `DEFAULT_CONFIG` → CLI options → programmatic overrides. Key settings include quality (1-100), effort (1-10), max dimensions, concurrency (1-32), and output control.

### Dependencies
- **Sharp**: Core image processing with async operations
- **heic-convert**: HEIC/HEIF format support for iPhone photos
- **Commander**: CLI argument parsing
- **Glob**: File pattern matching with built-in exclusion support
- **Jest**: Testing framework with 60+ tests

## Important Implementation Details

### Image Processing Specifics
- Never upscales images (uses `withoutEnlargement: true`)
- Applies AVIF-specific optimizations (4:2:0 chroma subsampling)
- Preserves aspect ratios during resizing calculations
- Uses Lanczos3 kernel for high-quality scaling
- All file operations use async/await (no sync operations)
- HEIC/HEIF files are preprocessed to JPEG before AVIF conversion

### File Handling Patterns
- Supports formats: JPG, JPEG, PNG, WebP, TIFF, TIF, HEIC, HEIF
- Creates output directories recursively as needed
- Preserves original files by default (configurable)
- Filters out system directories (.git, node_modules) during discovery
- Uses glob's built-in ignore patterns (no external minimatch)

### Error Handling
- Centralized error types in `error-handler.js`
- Continues batch processing when individual files fail
- Provides detailed error messages with helpful suggestions
- Graceful handling of missing files or unsupported formats
- Special handling for HEIC preprocessing errors

### Performance Features
- Parallel processing with automatic CPU core detection
- Configurable concurrency (--concurrency flag)
- Async file operations throughout
- Progress reporting works correctly with parallel operations
- 3-4x faster batch processing compared to sequential

## Testing Approach
```bash
# Run the full test suite
npm test

# Test specific modules
npm test validation
npm test image-processor
npm test parallel-processor

# Check type annotations
npm run typecheck
```

- Comprehensive unit tests for all modules
- Mocked file system operations
- Mocked Sharp and heic-convert libraries
- Test parallel processing with different concurrency levels
- Verify HEIC/HEIF conversion pipeline

## Test Files Available
The `test-images/` directory contains sample files for testing:
- `file_example_JPG_500kB.jpg` - JPEG format test file
- `file_example_PNG_500kB.png` - PNG format test file  
- `file_example_TIFF_1MB.tiff` - TIFF format test file
- `file_example_WEBP_500kB.webp` - WebP format test file
- `file_example_HEIC_2MB.heic` - HEIC format test file (iPhone photo format)
- `file_example_HEIF_500kB.heif` - HEIF format test file

## Best Practices When Modifying Code

1. **Maintain Modularity**: Keep modules focused on single responsibilities
2. **Use Async Operations**: All file I/O should use async/await
3. **Add Tests**: Write tests for new functionality
4. **Update JSDoc**: Keep type annotations up to date
5. **Error Recovery**: Ensure batch operations can continue on errors
6. **Performance**: Consider parallel processing implications

## Common Tasks

### Adding a New Image Format
1. Add format to `SUPPORTED_FORMATS` in `constants.js`
2. Update format handling in `convertImageToAvif()` if preprocessing needed
3. Add tests for the new format
4. Update documentation

### Modifying Processing Pipeline
1. Changes go in `image-processor.js`
2. Ensure async operations are maintained
3. Update tests accordingly
4. Consider parallel processing implications

### Adding CLI Options
1. Add to `cli.js` using Commander
2. Add validation in `validation.js` if needed
3. Update `DEFAULT_CONFIG` in `constants.js`
4. Add tests for the new option

## Report Generation Feature

The tool can generate detailed conversion reports for tracking and migration:

### Usage
```bash
# Generate reports after conversion
avif-optimizer . --recursive --generate-report

# Creates two files:
# - avif-report-YYYYMMDD-HHMMSS.md (human-readable)
# - avif-report-YYYYMMDD-HHMMSS.json (machine-readable)
```

### Report Contents
- Summary statistics and performance metrics
- Detailed conversion results for each file
- Code migration examples for various frameworks
- Search patterns for finding image references
- File checklist showing which files need updating

### AI-Assisted Migration Workflow
1. Run optimizer with `--generate-report`
2. Open the markdown report in Claude Code
3. Ask Claude to update all image references using the report
4. The report includes all necessary mappings and code patterns

### Implementation Details
- Module: `src/report-generator.js`
- Functions: `generateMarkdownReport()`, `generateJsonReport()`, `saveReports()`
- Integrated with CLI via `--generate-report` flag
- Tests in `test/report-generator.test.js`