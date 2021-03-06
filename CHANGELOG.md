# Changelog

### v0.6.0 July 24, 2016 21:47:00 UTC+0
- Added `def` syntax for binding values to immutable identifiers
- Added better positional information for errors
- Altered safe and escape rules to allow for using different escapes on default-safe
- Added function chaining with a pipe syntax
- Added compiler options for setting:
    - keepWhitespace: maintains user whitespace on output
    - defaultEscape: the function to use for escaping content by default
- Added `pragma` function to allow setting compiler options per-template in the template
- Added tests for browsers

### v0.5.3 July 17, 2016 02:09:00 UTC+0
- Also pass render-context to strings loader. Only `stringsLoader`.

### v0.5.1 July 17, 2016 01:40:00 UTC+0
- Now passing strings and render-context to viewmodel constructors

### v0.5.0 July 16, 2016 21:50:00 UTC+0
- Added shared render-factory caching on top of existing instance-level cache
- Added ability to disable caching for individual instances
- Changed callback style to support optional parameters
- Added render-contexts for pass contextual information through components
- Changed function vs variable resolving to compiled code for JS bind rules
- Added `get` internal function for using a dynamic key/index in maps/arrays
- Changed references of "context" to the more appropriate "namespace" nomenclature
- Added ability to automatically search namespaces for non-namespaced identifiers

### v0.4.2 July 10, 2016 20:40:00 UTC+0
- Fixing typo in packagejson breaking compiler

### v0.4.1 July 9, 2016 20:10:00 UTC+0
- Adjust internal API to allow changing the source/viewModel/strings-Loaders

### v0.4.0 July 9, 2016 03:35:00 UTC+0
- Massive refactoring to much of the code
    - Compiler now depends on Lisplate-core, instead of the other way
    - Adjusted many of the internal names
    - Exposing internals such as Chunk and Runtime
- Changed how module loading and compiling occurs
- Added a pre-compiler script
- Changed how `safe` works, by using a functional approach instead of sigils
- Moved internal-runtime function knowledge to compiler instead of parser
- Fixed:
    - thenable check is not fully A+ compliant
- Added unit tests to validate UMD
- Added unit test to validate compiling modules

### v0.3.0 July 6, 2016 18:35:00 UTC+0
- Added unit tests with jasmine
- Increased code coverage to over 95%
- Changed parts from CommonJS to UMD
- Added core and full builds in dist folder targetting browsers
- Can now use synchronous or callback style for sourceLoader, viewModelLoader, and stringsLoader
- Fixed:
    - Each with a thenable fails to execute
    - If with a thenable does not print correctly all the time
    - Comments cannot be used outside of another expression
    - Load template does not accept a function for templateName
    - compileFn continues to execute even after compiler errors

### v0.2.0 July 3, 2016 17:40:00 UTC+0
- Added template-integration tests using jasmine
- Added eslint for checks
- Added istanbul code coverage
- Fixed:
    - Using raw causes exception
    - Using escapes causes exception
    - Can write undefined
    - Can not use the rb escape due to `~r` being parsed first
    - Can not use `>=` or `<=` due to `<` and `>` being parsed first
    - Can not use `and`, `or`, and `not` as parser sees as identifiers
    - Parser does not detect `true` and `false` as booleans, sees identifier
- Removed `!=` until a solution is determined (see issue #24)

### v0.1.0 July 2, 2016 15:00:00 UTC+0
- Initial release of the Lisplate engine
