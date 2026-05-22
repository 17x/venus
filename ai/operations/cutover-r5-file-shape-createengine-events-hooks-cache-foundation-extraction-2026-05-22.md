[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/api/createEngine.ts
  - packages/engine/src/api/createEngine.events-hooks-cache.foundation.ts

Goal:

- Problem being solved:
  - Reduce createEngine.ts hard-limit pressure by extracting event/hook listener orchestration helpers and cache namespace resolver into a dedicated foundation module while preserving behavior.

Change Type:

- Modify
- Add

Impact:

- Affected modules:
  - packages/engine/src/api/createEngine.ts
  - packages/engine/src/api/createEngine.events-hooks.facade.ts (indirect call-site dependency wiring only)
  - packages/engine/src/api/createEngine.cache-policy-security.facade.ts (indirect call-site dependency wiring only)

Cleanup:

- Old logic to remove:
  - Inline helper functions in createEngine.ts:
    - resolveEventListenerSet
    - assertValidEventType
    - assertValidEventListener
    - registerEventListener
    - unregisterEventListener
    - unregisterAllEventListeners
    - emitEvent
    - resolveHookListenerSet
    - assertValidHookListener
    - registerHookListener
    - unregisterHookListener
    - unregisterAllHookListeners
    - emitHook
    - resolveHookListenerStats
    - resolveEventListenerStats
    - appendSecurityAuditLog
    - resolveCacheNamespace

Tests:

- Tests to add/update:
  - No new behavior expected; run existing compile + file-shape validation gates.
