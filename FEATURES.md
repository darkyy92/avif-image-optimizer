# Feature Ideas

This file contains potential features and enhancements for avif-image-optimizer, organized by implementation effort.

## Quick Wins (1-2 hours with AI assistance)

### CLI Enhancements
- [x] **Dry run mode** (`--dry-run`) - Show what would be processed without converting
- [x] **Verbose/quiet modes** (`--verbose`, `--quiet`) - Control output verbosity
- [ ] **Progress bar** for batch operations using a simple CLI progress library
- [x] **JSON output mode** (`--json`) - Output statistics as JSON for scripting
- [x] **Force overwrite** (`--force`) - Skip confirmation when output files exist
- [x] **Input validation** - Comprehensive validation with helpful error messages
- [x] **Parallel processing** (`--concurrency`) - Multi-core batch processing

### Output & Statistics
- [ ] **CSV export** of conversion statistics
- [ ] **Before/after image comparison** in terminal (using image-to-ascii)
- [ ] **File size histogram** - Visual representation of size savings
- [x] **Processing time tracking** - Detailed timing for each file and batch total

### File Handling
- [x] **Exclude patterns** (`--exclude "*.thumb.*"`) - Skip files matching patterns
- [ ] **Date-based filtering** - Only process files newer/older than X days
- [ ] **Backup mode** - Copy originals to backup directory before conversion
- [ ] **Resume capability** - Skip already converted files in batch operations
- [x] **Async file operations** - All file I/O now uses async/await

## Medium Effort (2-4 hours)

### Quality & Processing
- [ ] **Smart quality detection** - Analyze input image to suggest optimal quality
- [ ] **Multiple output qualities** - Generate thumbnail + full size in one pass
- [ ] **Lossless mode** for graphics/screenshots vs photos
- [ ] **WebP fallback generation** - Create both AVIF and WebP outputs
- [ ] **Progressive AVIF** support for faster loading

### CLI Tools Integration
- [ ] **Watch mode** - Monitor directory for new files and auto-convert
- [ ] **Integration with imagemin** - Plugin for build tools
- [ ] **Docker container** with pre-built binary
- [ ] **Shell completion** for bash/zsh

### Metadata & Standards
- [ ] **EXIF data preservation** option
- [ ] **ICC color profile** handling
- [ ] **Orientation correction** from EXIF data

## Larger Features (4+ hours)

### Advanced Processing
- [x] **Batch processing with parallelization** - Configurable concurrency (1-32)
- [ ] **Cloud storage support** (S3, Google Cloud Storage)
- [ ] **Image optimization presets** (web, print, mobile, etc.)
- [ ] **Content-aware cropping** using Sharp's attention algorithm
- [ ] **GPU acceleration** for even faster processing

### Web Integration
- [ ] **HTML generator** - Create `<picture>` elements with fallbacks
- [ ] **Build tool plugins** (Webpack, Vite, Rollup)
- [ ] **GitHub Action** for automated optimization in CI/CD
- [ ] **CDN integration** - Direct upload to Cloudflare, Fastly, etc.

### User Interface
- [ ] **Web UI** for drag-and-drop batch conversion
- [ ] **Configuration file** support (`.avifrc.json`)
- [ ] **Interactive mode** with prompts for batch operations
- [ ] **Desktop app** using Electron or Tauri

## Implementation Notes

### Quick Wins Priority
1. Dry run mode - most requested feature for safety
2. JSON output - enables scripting and automation  
3. Exclude patterns - common need for selective processing
4. Verbose/quiet modes - improves UX for different use cases

### Technical Considerations
- Most CLI enhancements can reuse existing `commander` setup
- Statistics features can extend current reporting system
- File handling improvements build on existing glob patterns
- Consider backwards compatibility when adding new options

### Testing Strategy
- [x] **Unit tests** - Comprehensive test suite with Jest (60+ tests)
- [x] **Mock file system** - All file operations properly mocked
- [x] **Type checking** - JSDoc annotations with TypeScript checking
- [ ] **Integration tests** with real images of different formats
- [ ] **Performance benchmarks** - Track performance across versions
- [ ] **E2E tests** - Full CLI execution tests

## Completed Improvements (v1.1.0)

### Architecture & Code Quality
- [x] **Modular architecture** - Separated concerns into focused modules
- [x] **Centralized error handling** - Consistent error messages and recovery
- [x] **Output formatting module** - Clean separation of display logic
- [x] **Validation module** - All input validation in one place
- [x] **Constants module** - Shared configuration and constants
- [x] **Type safety** - JSDoc annotations throughout codebase

### Performance Enhancements
- [x] **Parallel processing** - Multi-core support with configurable concurrency
- [x] **Async file operations** - No blocking I/O operations
- [x] **Optimized file discovery** - Uses glob's built-in exclusion
- [x] **Memory efficiency** - Streams and buffers used appropriately

### Developer Experience
- [x] **Comprehensive tests** - Full test coverage with Jest
- [x] **Type checking** - `npm run typecheck` for JSDoc validation
- [x] **Clean exports** - Well-organized programmatic API
- [x] **Error recovery** - Batch processing continues on errors