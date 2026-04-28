# @venus/editor-primitive

`@venus/editor-primitive` defines reusable editor interaction primitives.

## Responsibility

- Own package-agnostic interaction contracts and runtime helpers.
- Provide a full interaction pipeline: pointer/keyboard -> gesture/shortcut -> target/capture -> tool/operation -> command bridge -> runtime feedback.
- Provide pointer/keyboard/shortcut/gesture/tool/operation/target/command/selection/policy/hover/overlay/cursor/viewport/capture/runtime modules.
- Provide normalized input contracts in `input` + `runtime` so adapters can dispatch stable event unions.
- Depend only on low-level abstractions from `@venus/lib`.

## Module Coverage

- `pointer`: pointer runtime contracts, drag threshold helpers, pointer state reducers, normalized pointer event contract.
- `keyboard`: modifier/key runtime contracts and keydown/keyup reducers.
- `input`: normalized modifier-state contract shared by pointer/keyboard/wheel adapters.
- `shortcut`: platform-aware shortcut chord parser/matcher and IME/text-editing shortcut guard.
- `gesture`: gesture policy + pointer-to-gesture intent resolver.
- `tool`: current/temporary/effective tool contracts and resolver helpers.
- `operation`: active operation, drag/gesture, command session, lifecycle manager + explicit operation phases.
- `target`: interaction target contracts, stable priority resolver, multi-hit target stack, piercing-target picker.
- `command`: operation-to-command preview/commit/cancel bridge contracts.
- `selection`: id-only selection primitive state and mutators.
- `policy`: central interaction policy defaults and override resolver.
- `hover`: overlay/scene hover runtime contract and change detection helper.
- `overlay`: overlay node schema, runtime state, sorting, hit-tolerance helpers.
- `cursor`: cursor intent schema, resize mapping, runtime resolver, DOM applier.
- `viewport`: viewport interaction runtime and shared zoom preset policy.
- `capture`: pointer capture ownership runtime contract.
- `runtime`: top-level interaction runtime composition contracts, normalized interaction event union, pipeline orchestrator, runtime state/result contracts, and pure event dispatcher.
  - emits structured warning diagnostics (`InteractionWarning`) for guarded/degraded branches.
  - emits viewport intents (`ViewportIntent`) for wheel and gesture-driven camera policy routing.

## Canonical Pipeline

```txt
Input event
-> Pointer + Keyboard runtime normalization
-> Gesture + Shortcut resolution
-> Target + Capture resolution
-> Effective Tool routing
-> Active Operation lifecycle update
-> Command bridge preview/commit/cancel
-> Runtime patch + Hover/Cursor/Overlay/Viewport feedback
```

## API Usage

### Pointer

```ts
import {createPointerRuntime, applyPointerDown, applyPointerMove, applyPointerUp} from '@venus/editor-primitive'

const pointer = createPointerRuntime({x: 0, y: 0})
const afterDown = applyPointerDown(pointer, event)
const afterMove = applyPointerMove(afterDown, event)
const afterUp = applyPointerUp(afterMove, event)
```

### Keyboard

```ts
import {createKeyboardRuntime, applyKeyboardKeyDown, applyKeyboardKeyUp} from '@venus/editor-primitive'

const keyboard = createKeyboardRuntime()
const withSpace = applyKeyboardKeyDown(keyboard, {key: ' '})
const withoutSpace = applyKeyboardKeyUp(withSpace, {key: ' '})
```

### Tool + Operation

```ts
import {resolveEffectiveTool, createOperationLifecycleManager} from '@venus/editor-primitive'

const tool = resolveEffectiveTool({currentTool: 'select', effectiveTool: 'select', temporaryTool: 'pan'})
const lifecycle = createOperationLifecycleManager({dragThresholdPx: 4})
```

### Gesture + Target + Policy

```ts
import {
  resolveGestureIntent,
  resolveGesturePolicy,
  resolveInteractionPolicy,
  resolveInteractionTarget,
} from '@venus/editor-primitive'

const gesturePolicy = resolveGesturePolicy({dragThreshold: 6})
const policy = resolveInteractionPolicy({overlayHitPriority: true})
const target = resolveInteractionTarget({overlayHandleTarget: {type: 'overlay-handle', id: 'h-1', handle: 'ne'}})
const gesture = resolveGestureIntent({
  previous: pointerBefore,
  next: pointerAfter,
  eventType: 'pointermove',
  policy: gesturePolicy,
})
```

### Shortcut + Selection + Command Bridge

```ts
import {
  addSelectionId,
  createOperationCommandSession,
  createSelectionState,
  matchesShortcut,
  parseShortcutChord,
} from '@venus/editor-primitive'

const chord = parseShortcutChord('mod+z')
const canUndo = matchesShortcut({pressedKeys: keyboard.pressedKeys, platform: 'mac'}, chord)

const selection = addSelectionId(createSelectionState<string>(), 'node-1')

const commandSession = createOperationCommandSession('drag-1', {
  preview: (patch) => previewPatch(patch),
  commit: (patch) => commitPatch(patch),
  cancel: () => cancelPatch(),
})
```

### Cursor + Viewport

```ts
import {resizeDirectionToCssCursor, RUNTIME_ZOOM_PRESETS, resolveRuntimeZoomPresetScale} from '@venus/editor-primitive'

const cursor = resizeDirectionToCssCursor('ne', 30)
const nextScale = resolveRuntimeZoomPresetScale(1, 'in')
```

### Overlay + Hover + Capture

```ts
import {sortOverlayNodesByZIndex, resolveHoverRuntime, createCaptureRuntime} from '@venus/editor-primitive'

const ordered = sortOverlayNodesByZIndex(nodes)
const hover = resolveHoverRuntime(previousHover, {overlayHit, sceneHit})
const capture = createCaptureRuntime()
```

### Runtime State + Result + Dispatch

```ts
import {
  dispatchInteractionEvent,
  type InteractionRuntimeState,
  type InteractionResult,
  type NormalizedInteractionEvent,
} from '@venus/editor-primitive'

const event: NormalizedInteractionEvent = {
  type: 'pointer-down',
  eventId: 'evt-1',
  event: pointerEvent,
}
const result: InteractionResult = dispatchInteractionEvent(state as InteractionRuntimeState, event)
```

### Target Stack + Piercing Pick

```ts
import {createTargetStack, pickNextTarget} from '@venus/editor-primitive'

const stack = createTargetStack(pointer, targets)
const next = pickNextTarget(stack, current)
```

### Shortcut Guard + Normalized Input

```ts
import {
  createNormalizedPointerEvent,
  createEmptyModifierState,
  shouldHandleEditorShortcut,
  type NormalizedKeyboardEvent,
} from '@venus/editor-primitive'

const pointer = createNormalizedPointerEvent(input)
const keyboard: NormalizedKeyboardEvent = {
  key: 'z',
  code: 'KeyZ',
  modifiers: createEmptyModifierState(),
  repeat: false,
  timestamp: Date.now(),
  isComposing: false,
}
const canHandle = shouldHandleEditorShortcut({isTextEditing: false, isComposing: keyboard.isComposing})
```

## Tests

- Package tests run with `node:test` under `src/**/*.test.ts`.
- Coverage includes normalized input contracts (`ModifierState`, `NormalizedKeyboardEvent`, `NormalizedWheelEvent`) and runtime warning/lifecycle interrupt dispatch branches.
- Run package checks with:
  - `pnpm --filter @venus/editor-primitive typecheck`
  - `pnpm --filter @venus/editor-primitive lint`
  - `pnpm --filter @venus/editor-primitive test`

## Boundary

- Must not depend on app packages.
- Must not depend on engine implementation internals.
- Must not encode product document semantics, command semantics, or UI policy.
