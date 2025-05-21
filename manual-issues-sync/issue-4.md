# Issue #4: Add verbose and quiet modes

Add verbose and quiet output modes to control console verbosity.

## Expected behavior
- `--verbose`: Show detailed processing info (file analysis, dimension calculations, etc.)
- `--quiet`: Suppress all output except errors and final summary
- Normal mode: Current behavior (balanced output)

## Implementation notes
- Add `--verbose` and `--quiet` CLI flags
- Create output utility functions (verbose(), quiet(), normal())
- Replace console.log calls with appropriate output functions
- Ensure errors always show regardless of mode

## Use cases
- Quiet mode for automated scripts
- Verbose mode for debugging and detailed analysis
- Integration with CI/CD systems

## Priority
Quick win - should take 1-2 hours to implement.

## Labels
- enhancement
- quick-win
- cli-enhancement