# Documentation Versioning And Routing

## Source Of Truth Rules

- Markdown in repository + Git history is the only source of truth.
- Obsidian is navigation and linking layer, not duplicate storage.

## Update Priority (Conflict Resolution)

1. `04_DECISIONS.md`
2. `STATE.md`
3. `05_CHANGELOG.md`
4. `docs/product/prd.md`
5. `docs/product/figma-mapping.md`
6. `docs/architecture/overview.md`
7. `docs/ai/*.md`
8. Other local/legacy docs

## Routing Rules

- Status-only facts -> `STATE.md`
- Confirmed decisions -> `04_DECISIONS.md` + `docs/decisions/*`
- Timeline deltas -> `05_CHANGELOG.md`
- Task movement -> `06_TODO.md`
- Product requirements/scope -> `docs/product/*`
- Long-term system boundaries and flows -> `docs/architecture/*`
- AI workflows and prompt governance -> `docs/ai/*`
- App-local implementation docs -> owning app README or app-local docs
- Package-local implementation docs -> owning package README or package-local docs
- Runtime and product-adoption notes for vector ->
  `apps/vector-editor-web/docs/*`

## Anti-Drift Rules

- Do not overload root README with long requirement/architecture detail.
- When a topic grows stable and reusable, split it to a dedicated domain doc.
- Add new long-term docs to `docs/index.md` and `docs/ai/handoff.md`.
- Keep app-specific and package-specific implementation detail out of global
  `docs/` when a local documentation home exists.
- Do not write local absolute filesystem paths in documentation.
- Prefer repository-relative paths, package names, logical import paths, or
  domain docs when referring to code locations.
