# Issue #3: Add exclude patterns support

Add ability to exclude files matching specific patterns during batch processing.

## Expected behavior
- Support glob patterns for exclusion
- Multiple exclude patterns should be supported  
- Apply exclusions after initial file discovery
- Show excluded files count in verbose mode

## Use cases
- Skip thumbnail files
- Avoid processing temporary files
- Exclude specific directories or file types
- Ignore already optimized files  

## Implementation notes
- Add `--exclude` option accepting glob patterns
- Filter discovered files using exclusion patterns
- Integrate with existing glob-based file discovery

## Priority
Quick win - should take 1-2 hours to implement with AI assistance.

## Labels
- enhancement
- quick-win