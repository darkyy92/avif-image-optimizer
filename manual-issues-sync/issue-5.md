# Issue #5: Add force overwrite option

Add force overwrite option to skip confirmation when output files already exist.

## Expected behavior
- `--force`: Overwrite existing .avif files without prompting
- Default: Show warning and skip existing files (or prompt user)
- Show count of skipped files in summary

## Implementation notes
- Add `--force` CLI flag
- Check if output file exists before processing
- Add user prompt functionality (or skip with warning)
- Update summary to show skipped file count

## Use cases
- Reprocessing with different settings
- Automated batch processing
- Development and testing workflows

## Priority
Quick win - should take 1-2 hours to implement.

## Labels
- enhancement
- quick-win
- cli-enhancement