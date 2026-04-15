# Reusable Prompts

## Session Kickoff Prompt

```text
Read in order: 00_README.md -> STATE.md -> docs/index.md -> docs/product/prd.md -> 04_DECISIONS.md -> 05_CHANGELOG.md -> 06_TODO.md -> docs/architecture/overview.md -> docs/ai/handoff.md.
Then summarize: goal, current phase, confirmed decisions, open questions, stale-doc risks, next steps.
```

## Daily Discussion Prompt

```text
Answer the question first.
Then output a Knowledge Capture Check with:
- New decisions
- PRD changes
- Architecture changes
- Status changes
- TODO changes
- Figma mapping changes
- Reusable prompts/workflows
- Obsidian/index changes
- Package doc changes
- Documents to update
```

## Documentation Sink Prompt

```text
Only capture confirmed, reusable facts.
Route each fact to a specific doc path.
Do not write exploratory or unconfirmed content.
```
