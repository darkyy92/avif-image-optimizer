# Issue #2: Add JSON output mode

Add JSON output option for scripting and automation integration.

## Expected behavior
- Output conversion results as structured JSON
- Include file paths, sizes, dimensions, and savings  
- Suppress regular console output when JSON mode is active
- Maintain error reporting via stderr

## Use cases
- CI/CD pipeline integration
- Build tool automation
- Statistics collection and analysis

## Implementation notes  
- Add `--json` flag to CLI options
- Modify output functions to support JSON format
- Ensure valid JSON structure for all result types

## Priority
Quick win - should take 1-2 hours to implement with AI assistance.

## Labels
- enhancement
- quick-win