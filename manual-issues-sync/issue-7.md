# Issue #7: Improve input validation and error messages

Add better input validation with helpful error messages for CLI options.

## Expected behavior
- Validate quality range (1-100) with helpful error message
- Validate effort range (1-10) with helpful error message  
- Check if input files/directories exist before processing
- Validate output directory is writable
- Show specific error messages instead of generic failures

## Implementation notes
- Add validation functions for numeric ranges
- Add file system checks before processing starts
- Improve error messages throughout the application
- Add input sanitization where needed

## Use cases
- Better user experience for new users
- Clearer debugging information
- Prevent common usage errors

## Priority
Quick win - should take 1-2 hours to implement.

## Labels
- enhancement
- quick-win
- cli-enhancement