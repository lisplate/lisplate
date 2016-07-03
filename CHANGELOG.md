# Changelog

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
