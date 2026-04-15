# Documentation Update Rules

## Trigger Conditions

Update docs when any of the following is confirmed:

- decision accepted/rejected
- PRD scope or acceptance changes
- architecture boundary changes
- project status changes
- reusable prompt/workflow formed
- Obsidian/index/navigation structure changes

## Do Not Capture By Default

- exploratory discussion
- unconfirmed ideas
- duplicate information
- temporary chat context
- emotional or non-reusable text

## Routing Table

- `STATE.md`: current phase, most important confirmed facts, blocker, next step
- `04_DECISIONS.md`: confirmed decisions, rationale, rejected options, impact
- `05_CHANGELOG.md`: add/modify/delete/adjust timeline entries
- `06_TODO.md`: in-progress, next, blocked, done
- `docs/product/prd.md`: goals, scenarios, functional requirements, acceptance
- `docs/product/figma-mapping.md`: UI to PRD mapping and design coverage
- `docs/architecture/*`: module boundaries, runtime/system design, data flow
- `docs/ai/prompts.md`: reusable prompt templates
- `docs/ai/workflows.md`: reusable collaboration workflows
- `docs/decisions/*`: ADR records
- package/app README/docs: local module responsibilities and boundaries

## Conflict Resolution Priority

1. `04_DECISIONS.md`
2. `STATE.md`
3. `05_CHANGELOG.md`
4. `docs/product/prd.md`
5. `docs/product/figma-mapping.md`
6. `docs/architecture/overview.md`
7. `docs/ai/*.md`
8. other local or legacy docs

## Obsidian Rules

- Keep a single markdown source in repo; no parallel mirror copies.
- Maintain stable relative links and canonical paths.
- Keep major navigation entrypoints current:
  - `00_README.md`
  - `STATE.md`
  - `docs/index.md`
  - `docs/ai/handoff.md`
