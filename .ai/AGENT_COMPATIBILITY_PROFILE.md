# Agent Compatibility Profile

Status: Active
Scope: Cross-agent execution compatibility

## 1. Purpose

This file defines a normalized compatibility profile so different AI agents can execute the same governance contract consistently.

## 2. Required Agent Declaration

Before non-trivial execution, an agent must declare:

- Agent identity/version (if available)
- Capability tier: Tier A / Tier B / Tier C
- Available mutation channels (edit tools, terminal, review-only)
- Validation execution capability (full/partial/none)

## 3. Capability Tiers

### Tier A (Full Execution)

- Can read/edit files.
- Can execute validation commands.
- Can provide verified outcomes.

Mandatory output:

- Evidence bundle with command outcomes.

### Tier B (Constrained Execution)

- Can read/edit files.
- Cannot execute all required validations.

Mandatory output:

- Exact command list for deferred validation.
- Explicit `UNVERIFIED` marker for unexecuted gates.

### Tier C (Advisory)

- Can read/analyze.
- Cannot mutate code.

Mandatory output:

- Findings, risk ranking, and implementation plan only.

## 4. Normalized Handoff Schema

Every non-trivial handoff should include:

- Scope
- Changed files or planned files
- Validation gates and status (`PASS` | `FAIL` | `UNVERIFIED`)
- Cleanup performed
- Exceptions raised (`[GOV-EXCEPTION]` if any)
- Residual risks

## 5. Prohibited Cross-Agent Drift

- Do not claim PASS for commands not executed.
- Do not downgrade mandatory rules based on tool limitations.
- Do not hide skipped steps.

## 6. Repository Layer Binding

- Root governance authority: `.ai/`
- Local governance authority: `.ai-local/`
- Running task state: `.ai-tasks/`

Authority precedence:

1. `.ai/AI_NATIVE_ENGINEERING_GOVERNANCE.md`
2. `.ai/REPO_GOVERNANCE_PREFERENCES_EXTRACTED.md`
3. `.ai-local/AI_HIGHEST_STANDARD.md`
4. Repository instruction files
5. Module-local strict overrides
