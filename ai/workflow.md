# Workflow

This workflow is mandatory for non-trivial changes.

1. Scope Definition
- Identify target module and ownership boundary.
- List impacted files and expected side effects.

2. Type Definition
- Define or adjust contracts before behavior changes.
- For public contract changes, include semantic comments.

3. Change Request
- Fill this template before implementation:

[CHANGE REQUEST]
Target:
- File / Module:
Goal:
- Problem being solved:
Change Type:
- Add / Modify / Remove
Impact:
- Affected modules:
Cleanup:
- Old logic to remove:
Tests:
- Tests to add/update:

4. Test Design
- Define tests and validation scope first.
- Identify regression-sensitive paths.

5. Implementation
- Keep scope minimal.
- Preserve existing APIs unless explicitly changed.

6. Validation
- Run typecheck, lint, targeted tests, and required guards.

7. Cleanup Check
- Remove dead paths and temporary logic.
- Ensure no duplicate implementation tracks.

Execution discipline:
- Do not skip steps.
- If rules conflict, choose stricter rule and smallest safe change.
