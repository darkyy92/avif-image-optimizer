# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Quick Start

```bash
# Install and test
npm install
npm test                    # Run test suite (60+ tests)
npm run test:coverage      # Check coverage
npm run typecheck          # Validate JSDoc types

# Test CLI
node src/cli.js --help
node src/cli.js test-images/ --recursive --concurrency 8
node src/cli.js test-images/file_example_HEIC_2MB.heic --quality 80  # HEIC support

# Test programmatic API
node -e "import('./src/index.js').then(m => m.optimizeToAvif('test-images/', { concurrency: 4 }))"
```

## Architecture Overview

Modular image optimizer with parallel processing, supporting JPEG, PNG, WebP, TIFF, HEIC/HEIF → AVIF conversion.

### Module Structure
```
src/
├── cli.js              # CLI entry point
├── index.js            # Programmatic API
├── constants.js        # Shared configuration
├── validation.js       # Input validation
├── image-processor.js  # Core processing (async)
├── parallel-processor.js # Concurrent batch processing
├── error-handler.js    # Error handling & recovery
└── output-formatter.js # Display formatting
```

### Processing Pipeline
1. **Discovery**: Find images using glob patterns with exclusions
2. **Validation**: Check inputs and create output directories
3. **Parallel Processing**: Distribute work across CPU cores
4. **HEIC Preprocessing**: Convert HEIC/HEIF → JPEG → AVIF
5. **Optimization**: Resize and convert to AVIF with Sharp
6. **Error Recovery**: Continue batch on individual failures

### Key Technologies
- **Sharp**: Native image processing (fast AVIF encoding)
- **heic-convert**: JavaScript HEIC/HEIF decoder for iPhone photos
- **Commander**: CLI framework
- **Glob**: File pattern matching
- **Jest**: Testing framework

## Technical Details

### Performance Characteristics
- **Parallel Processing**: Uses CPU cores for 3-4x faster batch processing
- **Async I/O**: All file operations are non-blocking
- **Memory Efficient**: Streams large files, buffers for HEIC conversion
- **Smart Resizing**: Never upscales, maintains aspect ratios

### Supported Formats
- **Input**: JPEG, PNG, WebP, TIFF, HEIC/HEIF (iPhone photos)
- **Output**: AVIF with configurable quality (1-100)
- **HEIC Note**: Uses heic-convert for preprocessing (slower than native formats)

### Error Handling Strategy
- Centralized error types with specific handling
- Batch processing continues on individual failures  
- Detailed error messages with actionable suggestions
- Special handling for HEIC preprocessing errors

### Configuration Layers
1. Default config in `constants.js`
2. CLI flags override defaults
3. Programmatic options override CLI
4. All validation in `validation.js`

## Development Guidelines

### Code Style
- ES6 modules (`type: "module"` in package.json)
- Async/await for all I/O operations
- JSDoc type annotations throughout
- Single responsibility per module

### Testing Requirements
- Write tests for new features
- Mock external dependencies (Sharp, fs)
- Test error scenarios
- Verify parallel processing behavior

### Common Modifications

**Add Image Format**:
1. Update `SUPPORTED_FORMATS` in constants.js
2. Add preprocessing if needed (like HEIC)
3. Write format-specific tests
4. Update documentation

**Add CLI Option**:
1. Add to Commander in cli.js
2. Create validation function if needed
3. Update DEFAULT_CONFIG
4. Add option tests

**Improve Performance**:
1. Profile with large batches
2. Consider memory vs speed tradeoffs
3. Test concurrency limits
4. Benchmark before/after

## AI Agent Tips

1. **Use the test suite**: Run `npm test` frequently
2. **Check types**: Run `npm run typecheck` 
3. **Test parallelism**: Use `--concurrency` flag
4. **Mock carefully**: See existing test patterns
5. **Handle errors**: Ensure batch processing continues
6. **Document changes**: Update JSDoc annotations

## Resources

- [Sharp docs](https://sharp.pixelplumbing.com/)
- [AVIF spec](https://aomediacodec.github.io/av1-avif/)
- [heic-convert](https://github.com/catdad-experiments/heic-convert)
- [Commander.js](https://github.com/tj/commander.js/)