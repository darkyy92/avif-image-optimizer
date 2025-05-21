# Issue #1: Add dry run mode

Add a dry run option that shows what files would be processed and their estimated output without actually converting them.

## Expected behavior
- Show list of files that would be processed  
- Display estimated dimensions and file sizes
- Show total statistics without performing conversions
- Use existing file discovery logic

## Implementation notes
- Add `--dry-run` flag to CLI options
- Skip Sharp processing, just show file analysis  
- Reuse existing `findImageFiles` function

## Priority
Quick win - should take 1-2 hours to implement with AI assistance.

## Labels
- enhancement
- quick-win