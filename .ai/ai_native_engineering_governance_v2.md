# AI-Native Engineering Governance System v2 (Legacy Reference)

## Historical Draft Superseded by Root Charter

Status: Legacy reference only.
Superseded by: .ai/AI_NATIVE_ENGINEERING_GOVERNANCE.md
Purpose now: retain prior long-form rationale and examples.

For active governance execution, use:

- .ai/AI_NATIVE_ENGINEERING_GOVERNANCE.md
- .ai/REPO_GOVERNANCE_PREFERENCES_EXTRACTED.md

---

Original v2 text follows.

---

# 0. Purpose

This document defines:

- how AI should think
- how AI should execute
- how AI should mutate systems
- how AI should avoid entropy
- how AI should preserve architecture
- how AI should behave as a long-term maintainer

This is NOT:

- coding style
- lint rules
- formatting guidance

This IS:

- operational governance
- architectural law
- entropy control
- system evolution policy
- AI runtime behavior control

---

# 1. Core Philosophy

Traditional software assumes:

- humans are maintainers
- AI is an assistant
- systems evolve slowly
- abstractions are carefully reviewed

AI-native engineering changes this completely.

In AI-native systems:

- AI becomes a primary contributor
- repositories become AI operating environments
- architecture becomes machine-readable cognition
- entropy grows continuously
- architectural drift becomes automatic unless constrained

Therefore:

```txt
The repository is a long-lived evolving system,
not a collection of isolated implementation tasks.
```

Primary objective:

```txt
Optimize for long-term evolvability,
not short-term task completion.
```

---

# 2. The Real Problem

AI naturally optimizes for:

```txt
local completion
```

NOT:

```txt
global architectural stability
```

Default AI behavior:

```txt
Task
→ solve locally
→ create abstraction
→ split file
→ create wrapper
→ create helper
→ add layer
→ exit
```

This creates:

- semantic inflation
- abstraction explosion
- wrapper proliferation
- ownership ambiguity
- runtime duplication
- orchestration leakage
- dependency corruption
- context fragmentation
- architectural drift

Eventually:

```txt
System entropy exceeds maintainability threshold.
```

---

# 3. System Goals

The governance system exists to preserve:

## 3.1 Domain Stability

AI must always understand:

- where code belongs
- who owns state
- where lifecycle exists
- which module has authority
- what boundaries exist

---

## 3.2 Boundary Stability

AI must never:

- violate dependency direction
- bypass ownership
- leak infrastructure
- create hidden coupling
- introduce circular knowledge

---

## 3.3 Semantic Stability

AI must avoid:

- unstable naming
- duplicate concepts
- wrapper chains
- meaningless abstractions
- local naming dialects

---

## 3.4 Evolution Stability

AI must continuously:

- reduce entropy
- consolidate abstractions
- remove dead layers
- improve coherence
- preserve maintainability

---

# 4. Core Engineering Laws

---

## Law 1

```txt
Prefer extension over creation.
```

---

## Law 2

```txt
Prefer consolidation over abstraction.
```

---

## Law 3

```txt
Stable domains matter more than implementation patterns.
```

---

## Law 4

```txt
Ownership must always be singular and explicit.
```

---

## Law 5

```txt
Every dependency introduces architectural gravity.
```

---

## Law 6

```txt
Local elegance must never damage global coherence.
```

---

## Law 7

```txt
Creation is expensive.
Modification is preferred.
```

---

## Law 8

```txt
Small duplication is cheaper than unstable abstraction.
```

---

## Law 9

```txt
Related logic should remain spatially close.
```

---

## Law 10

```txt
AI must behave like a long-term maintainer,
not a short-term feature implementer.
```

---

# 5. Repository Structure

Recommended governance structure:

```txt
.ai/
  constitution/
  governance/
  context/
  ownership/
  evolution/
  enforcement/
  policies/
  prompts/
  agents/
  routing/
  review/
  metrics/
```

---

# 6. Constitutional Layer

Defines immutable architectural law.

Structure:

```txt
.ai/constitution/
```

Contains:

```txt
vision.md
architecture.md
ownership.md
dependency.md
naming.md
runtime.md
anti-entropy.md
```

---

# 7. Vision Document

Defines:

- system philosophy
- evolution strategy
- engineering priorities
- long-term constraints

Example:

```txt
The system prioritizes:
- evolvability
- semantic stability
- low entropy
- explicit ownership
- deterministic boundaries
```

---

# 8. Architecture Constitution

Defines:

- top-level domains
- dependency direction
- architectural layers
- lifecycle ownership

Example:

```txt
foundation <- runtime <- application <- product
```

Forbidden reverse dependencies must be explicitly defined.

---

# 9. Ownership Constitution

Every module/domain must define:

```txt
What does this own?
What must never enter here?
Who may depend on this?
Who may modify this?
Who owns mutation authority?
```

Example:

```txt
runtime/

Owns:
- mutable execution state
- lifecycle scheduling

Does Not Own:
- UI
- persistence
- business logic

May Depend On:
- foundation

May Not Depend On:
- product
- application
```

---

# 10. Dependency Constitution

Defines:

- allowed dependency directions
- forbidden imports
- isolation rules
- anti-corruption boundaries

AI must never violate dependency law.

---

# 11. Semantic Governance

Semantic corruption is one of the largest entropy sources.

---

## Forbidden Naming Inflation

Avoid uncontrolled use of:

```txt
manager
helper
util
processor
wrapper
handler
base
core
shared
common
facade
bridge
controller
service
```

unless explicitly justified.

---

## Good Naming

Prefer:

```txt
runtime-world.ts
document-store.ts
render-pipeline.ts
event-queue.ts
```

Avoid:

```txt
runtimeManager.ts
renderHelper.ts
baseProcessor.ts
commonUtil.ts
```

---

## Forbidden File Naming

Avoid:

```txt
createXxx.xxx.xxx.ts
```

Avoid:

```txt
foo.helper.ts
foo.wrapper.ts
foo.manager.ts
```

---

# 12. Stable Domain Design

Top-level domains must represent stable cognition.

Good examples:

```txt
runtime/
render/
storage/
auth/
billing/
editor/
platform/
```

Bad examples:

```txt
utils/
shared/
helpers/
misc/
base/
common/
core/
```

These become entropy sinks.

---

# 13. File Creation Governance

AI naturally over-splits files.

This creates:

- context fragmentation
- navigation overhead
- ownership confusion
- abstraction inflation

---

## Forbidden Behaviors

### Forbidden

```txt
One-function files
```

unless ownership or lifecycle requires separation.

---

### Forbidden

```txt
Splitting files only for perceived cleanliness
```

---

### Forbidden

```txt
Micro-module architecture
```

---

## Required Before Creating Files

AI must answer:

```txt
Why can this remain in the current file?
What ownership boundary requires separation?
What lifecycle differs?
What dependency isolation exists?
```

---

# 14. Abstraction Governance

AI tends to abstract too early.

This is dangerous.

---

## Premature Abstraction Is Forbidden

Avoid:

```txt
BaseManager
AbstractService
GenericPipeline
UniversalRuntimeAdapter
```

---

## Duplication Tolerance Principle

```txt
Small duplication is preferable to unstable abstraction.
```

---

## Rule of Three

Only abstract after repeated stable patterns appear.

Minimum recommendation:

```txt
3 stable occurrences
```

before abstraction.

---

# 15. Future-Proofing Restrictions

AI frequently invents speculative architecture.

Forbidden:

```txt
future-proof abstractions
speculative plugin systems
unneeded extension layers
generic universal adapters
```

Principle:

```txt
Only abstract proven requirements.
```

---

# 16. Wrapper Governance

AI naturally creates wrapper chains.

Examples:

```txt
Facade
Manager
Bridge
Controller
Wrapper
Adapter
```

stacked repeatedly.

---

## Forbidden

```txt
wrapper around wrapper
```

---

## Forbidden

```txt
pass-through abstractions
```

Example:

```ts
function foo() {
  return runtime.foo();
}
```

without added ownership or transformation.

---

# 17. Architectural Depth Governance

Maximum abstraction depth must remain limited.

Allowed:

```txt
UI -> runtime -> backend
```

Dangerous:

```txt
UI
→ facade
→ manager
→ service
→ controller
→ runtime
→ bridge
→ backend
```

---

## Forbidden

- unnecessary orchestration chains
- layered forwarding
- deep wrapper pipelines

---

# 18. Context Density Principle

Related logic should remain spatially close.

Avoid:

```txt
micro-files
micro-modules
micro-abstractions
```

AI must optimize for:

```txt
high context density
```

not excessive fragmentation.

---

# 19. Mutation Governance

AI must not freely mutate unrelated systems.

---

## Mutation Radius

Each task defines:

```txt
affected domains
authorized modules
forbidden areas
```

---

## Forbidden

```txt
cross-system opportunistic refactors
```

unless explicitly approved.

---

# 20. Scope Drift Prevention

AI frequently expands task scope automatically.

This is dangerous.

---

## Required Before Execution

AI must define:

```txt
task scope
mutation boundaries
forbidden modules
affected systems
```

---

## Forbidden During Execution

```txt
silent scope expansion
```

without explicit justification.

---

# 21. Opportunistic Refactor Restrictions

AI often attempts:

```txt
"while I'm here" refactors
```

This destroys stability.

---

## Forbidden

Unrelated cleanup unless:

- blocking task completion
- fixing corruption
- removing duplication
- improving ownership integrity

---

# 22. Context Layer

Structure:

```txt
.ai/context/
```

Suggested files:

```txt
system-map.md
domain-map.md
ownership-map.md
runtime-model.md
dependency-graph.md
package-map.md
```

Purpose:

- reconstruct architecture cognition
- restore AI context
- preserve long-term system understanding

---

# 23. Context Routing

Large systems must avoid loading full governance context.

Instead:

```txt
task scope
→ determine affected domains
→ load only relevant governance
```

Example:

```txt
render task
→ load render governance
→ load runtime dependency rules
→ load render ownership
```

---

# 24. AI Role System

AI should not behave as one undifferentiated actor.

Recommended roles:

---

## Architect

Responsible for:

- boundaries
- ownership
- dependency integrity
- entropy reduction

---

## Implementer

Responsible for:

- implementation
- minimal mutation
- extension-first behavior

---

## Reviewer

Responsible for:

- semantic consistency
- abstraction inflation detection
- duplication detection
- governance enforcement

---

## Refactorer

Responsible for:

- consolidation
- cleanup
- entropy reduction
- abstraction removal

---

# 25. AI Execution Pipeline

Every task must follow:

```txt
1. Load governance context
2. Understand ownership
3. Understand dependencies
4. Define mutation scope
5. Search extension points
6. Detect duplication risk
7. Detect abstraction inflation
8. Prefer modification over creation
9. Minimize dependency impact
10. Implement changes
11. Self-review architectural impact
12. Report entropy changes
```

---

# 26. Self-Review System

After execution AI must evaluate:

```txt
Did this:
- increase abstraction depth?
- increase semantic ambiguity?
- introduce duplication?
- increase coupling?
- violate ownership?
- create unstable naming?
- increase wrapper depth?
- introduce orchestration leakage?
- increase entropy?
```

---

# 27. Decision Logging

All major structural decisions require justification.

AI must explain:

```txt
Why new file?
Why new abstraction?
Why new dependency?
Why new module?
Why ownership changed?
Why extension was insufficient?
```

---

# 28. Entropy Metrics

Suggested measurable metrics:

```txt
- abstraction count
- wrapper depth
- orchestration depth
- dependency fan-out
- semantic duplication
- file fragmentation
- orphan modules
- naming uniqueness
```

---

# 29. Architectural Danger Signals

Detect automatically:

```txt
- facade inflation
- manager proliferation
- orchestration explosion
- utility sink growth
- cyclic ownership
- duplicate runtimes
- duplicate pipelines
- dependency spikes
```

---

# 30. Enforcement Layer

Governance without enforcement is decorative.

Structure:

```txt
.ai/enforcement/
```

---

# 31. Required Enforcement Systems

---

## Import Boundary Enforcement

Prevent forbidden dependency directions.

---

## Naming Enforcement

Reject forbidden semantic inflation.

---

## Ownership Enforcement

Prevent unauthorized mutation.

---

## Entropy Enforcement

Detect:

- duplicate abstractions
- wrapper inflation
- orchestration growth
- dependency explosion

---

## Architectural Integrity Enforcement

Detect:

- duplicated runtimes
- duplicated lifecycle systems
- hidden ownership
- unstable layering

---

# 32. Machine-Readable Governance

Governance must be machine-readable.

Example:

```yaml
rules:
  naming:
    forbidden:
      - "*.manager.ts"
      - "*.helper.ts"

  architecture:
    singleton:
      - runtime-world
      - scheduler

  dependency:
    forbidden:
      - "runtime -> product"
      - "foundation -> ui"

  file_creation:
    max_wrapper_depth: 2
    forbid_one_function_files: true
```

---

# 33. AI Bootstrap System

AI must never execute without governance bootstrap.

Execution bootstrap:

```txt
1. Load constitution
2. Load ownership map
3. Load dependency rules
4. Load anti-entropy rules
5. Load active domain context
6. Define task boundaries
7. Scan affected modules
8. Enter execution mode
```

---

# 34. AI Runtime Environment

The repository becomes:

```txt
AI Operating Environment
```

The `.ai/` directory becomes:

- memory
- cognition
- governance
- runtime configuration
- architectural law
- execution policy
- entropy control system

---

# 35. Final Objective

The goal is NOT:

```txt
AI-generated code
```

The goal IS:

# AI-maintained evolving systems

Where AI behaves as:

- architect
- maintainer
- reviewer
- optimizer
- entropy controller

rather than:

```txt
temporary task executor
```

---

# 36. Final Principle

```txt
A software system survives not by adding complexity,
but by continuously resisting unnecessary complexity.
```
