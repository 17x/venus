# AI Workflows

## Workflow A: New Session / New Member Handoff

Goal: fast state synchronization.

Steps:

1. Read canonical entry documents in handoff order.
2. Summarize goal, phase, decisions, open items.
3. Flag stale/conflicting docs.
4. Propose next steps.

## Workflow B: Daily Discussion

Goal: answer first, capture second.

Steps:

1. Answer the active project question.
2. Evaluate whether new durable knowledge was produced.
3. Emit `Knowledge Capture Check`.

## Workflow C: Stage-End Knowledge Capture

Trigger examples:

- PRD first pass done
- architecture confirmed
- package boundary confirmed
- feature moves into implementation or test phase

Steps:

1. Filter confirmed facts only.
2. Route facts by document responsibility.
3. Output patch-ready content per target file.

## Workflow D: Documentation Governance

Goal: prevent documentation decay.

Checks:

- wrong document placement
- overloaded README
- duplicate knowledge across docs
- missing index/handoff entry for new stable knowledge
- stale document still linked as active source
