# Issue #6: Add resume capability for batch operations

Add ability to resume interrupted batch operations by skipping already converted files.

## Expected behavior
- Automatically skip files that already have .avif output
- Show count of skipped vs processed files
- Option to force reprocessing of existing files
- Works with `--force` flag for complete reprocessing

## Implementation notes
- Check if corresponding .avif file exists before processing
- Add logic to `convertImageToAvif` function
- Update batch processing summary
- Consider modification time comparison for smarter skipping

## Use cases
- Resume interrupted large batch operations
- Incremental processing of image directories
- Avoid redundant processing in automated workflows

## Priority
Quick win - should take 1-2 hours to implement.

## Labels
- enhancement
- quick-win
- cli-enhancement