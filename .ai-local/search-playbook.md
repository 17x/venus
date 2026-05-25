# Search Playbook

Goal:

- Minimize latency and avoid broad, repeated scans.

Protocol:

1. Bound first

- Restrict scope to likely module path before searching.
- Example scopes: packages/engine/**, apps/vector-editor-web/**.

2. Symbol-first

- Prefer symbol usages and definitions over free-text search for functions/types.
- Use text search only when symbol lookup is unavailable.

3. Large-context reads

- Read larger contiguous ranges rather than many tiny reads.
- Avoid repeated single-line inspections.

4. Search budget

- Max 2 global scans per task phase.
- If unresolved after 2 scans, switch to entrypoint-driven navigation.

5. Entrypoint-driven fallback

- Start from index/barrel files, factory creators, or module README docs.
- Then follow imports and symbol references inward.

6. Cache findings in task notes

- Track located files, key symbols, and decisions to prevent repeated lookup.

Practical heuristics:

- Use filename pattern search for known file families.
- Use regex alternation for multiple candidate symbol names in one pass.
- Keep include patterns tight to reduce noise and execution time.
