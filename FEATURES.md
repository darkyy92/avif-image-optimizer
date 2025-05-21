# Feature Ideas

This file contains potential features and enhancements for avif-image-optimizer, organized by implementation effort.

## Quick Wins (1-2 hours with AI assistance)

### CLI Enhancements
- [ ] **Dry run mode** (`--dry-run`) - Show what would be processed without converting
- [ ] **Verbose/quiet modes** (`--verbose`, `--quiet`) - Control output verbosity
- [ ] **Progress bar** for batch operations using a simple CLI progress library
- [ ] **JSON output mode** (`--json`) - Output statistics as JSON for scripting
- [ ] **Force overwrite** (`--force`) - Skip confirmation when output files exist
- [ ] **Input validation** - Better error messages for invalid quality/effort values

### Output & Statistics
- [ ] **CSV export** of conversion statistics
- [ ] **Before/after image comparison** in terminal (using image-to-ascii)
- [ ] **File size histogram** - Visual representation of size savings
- [ ] **Processing time tracking** and reporting

### File Handling
- [ ] **Exclude patterns** (`--exclude "*.thumb.*"`) - Skip certain files
- [ ] **Date-based filtering** - Only process files newer/older than X days
- [ ] **Backup mode** - Copy originals to backup directory before conversion
- [ ] **Resume capability** - Skip already converted files in batch operations

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
- [ ] **Batch processing with worker threads** for CPU parallelization
- [ ] **Cloud storage support** (S3, Google Cloud Storage)
- [ ] **Image optimization presets** (web, print, mobile, etc.)
- [ ] **Content-aware cropping** using Sharp's attention algorithm

### Web Integration
- [ ] **HTML generator** - Create `<picture>` elements with fallbacks
- [ ] **Build tool plugins** (Webpack, Vite, Rollup)
- [ ] **GitHub Action** for automated optimization in CI/CD

### User Interface
- [ ] **Web UI** for drag-and-drop batch conversion
- [ ] **Configuration file** support (`.avifrc.json`)
- [ ] **Interactive mode** with prompts for batch operations

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
- Add CLI option tests using child_process to test actual execution
- Mock file system operations for unit tests
- Add integration tests with sample images of different formats
- Benchmark performance improvements for larger features