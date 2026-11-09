## Development Guidelines

- After each small module development (fix or update) is completed, a commit must be submitted to the Git repository, and co-author information must not be included. The commit style must be kept consistent, in the form of "(feat/fix, etc.)xxxxxx".
- During code writing, the code style must be kept consistent. Only camelCase naming may be used, and the casing of items in API interfaces and data bodies (classes) must remain consistent; inconsistencies are prohibited.
- When writing backend classes, the first letter of the class's member variable names must be uppercase, using standard alphabetic naming. If the class needs to be serialized to JSON, use a serialization naming utility to name the item in camelCase.
- During development, whether frontend or backend, large code files are strictly prohibited. When the logic of a file is complex, it must be split into multiple separate code files. Except under special circumstances, a code file must not exceed 350 lines.
- When developing complex, medium-to-large projects, during planning you must ask about business implementation details, such as what interfaces are needed, etc., and must not define them arbitrarily.
- The code style must be unified. Comments must not be written unless necessary. What counts as necessary: if the code of a function, line, or file is extremely complex or uses some very strange, uncommon logic implementation, then you need to explain why it is implemented this way. Comments must remain in English.
- This document is subject to change, and the AI assistant needs to update it according to the actual situation of the project.

## OTHER
