---
name: venus-standards-enforcer
description: Enforces Venus coding standards during AI edits. Use when requests include follow standards automatically, hard constraints, immediate fix on violation, missing comments, lint gate, or policy enforcement.
user-invocable: false
---

# Venus Standards Enforcer

Applies repository coding rules as an always-on workflow for AI edits, with deterministic blocking when violations are detected.

## When To Use

- User asks for hard constraints instead of reminder-based compliance.
- User requires immediate correction after each file modification.
- User specifically calls out missing intent comments or standards drift.

## What It Enforces

1. Every changed code file must add at least one intent comment when new code lines are introduced.
2. Temporary AI-authored changes must carry an `AI-TEMP:` tag when temporary markers are introduced.
3. Changed code files must pass ESLint immediately.
4. Violations must block the current flow until the code is corrected.

## Hard-Constraint Hook

- Workspace hook config: `./.github/hooks/ai-standards-enforcer.json`
- Enforcement script: `./scripts/posttooluse-enforce.sh`

## Procedure

1. Keep this skill in-repo so policy is shared across collaborators.
2. Register the PostToolUse hook to run the enforcement script.
3. On violation, stop and repair code before proceeding.
4. Re-run repository validation before handoff.

## References

- [PostToolUse Enforcer](./scripts/posttooluse-enforce.sh)
- [Coding Standards](../../../docs/engineering/coding-standards.md)
