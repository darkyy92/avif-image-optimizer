# Issue #8: Add processing time tracking and reporting

Add timing information to show how long each conversion takes.

## Expected behavior
- Show processing time for each individual file
- Display total processing time in batch summary
- Show average time per file for batch operations
- Include timing in JSON output mode

## Implementation notes
- Use `process.hrtime.bigint()` for high precision timing
- Add timing around Sharp processing operations
- Update console output to include timing info
- Add timing fields to result objects

## Use cases
- Performance analysis and optimization
- Benchmarking different settings
- Progress estimation for large batches

## Priority
Quick win - should take 1-2 hours to implement.

## Labels
- enhancement
- quick-win
- performance