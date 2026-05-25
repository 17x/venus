# Root AI Governance

This directory owns the highest-level AI-native governance for this repository.

Primary documents:

- AI_NATIVE_ENGINEERING_GOVERNANCE.md: cross-project governance charter (highest level)
- REPO_GOVERNANCE_PREFERENCES_EXTRACTED.md: portable preferences extracted from current repository
- AGENT_COMPATIBILITY_PROFILE.md: cross-agent capability normalization and handoff contract
- GOVERNANCE_EXECUTION_CHECKLIST.md: operational checklist for day-to-day execution
- GOVERNANCE_MACHINE_RULES.yaml: machine-readable governance baseline for automation

Operational automation:

- scripts/entropy-report/entropy-report.mjs: generates entropy dashboard under .ai-tasks/entropy/

Compatibility and legacy:

- Legacy drafts/specs are retained only as historical references.
- Project-specific governance with local semantics lives under .ai-local/.
- Running task documents live under .ai-tasks/.
