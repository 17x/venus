# @venus/ui

Shared shadcn-based UI package for Venus apps.

## Entry Points

- `@venus/ui`: app-neutral shadcn controls, compact fields, theme helpers, and `cn`.
- `@venus/ui/vector`: vector-editor compatibility kit and Base UI shadcn primitives.
- `@venus/ui/styles.css`: app-neutral Tailwind v4 tokens and component states.
- `@venus/ui/vector/styles.css`: vector editor Tailwind v4 tokens and semantic classes.

The default style entry intentionally does not include vector styles. Importing
`@venus/ui/vector` loads the product-specific vector style entry.

`@venus` is the npm workspace scope shared by Venus packages. Package managers
therefore materialize paths such as `node_modules/@venus/ui`; this is not a
nested `venus` source folder. The implementation has one physical owner:
`packages/ui`.

Consumers of the app-neutral entry must import `@venus/ui/styles.css` once from
their application stylesheet.

## Conventions

- Keep reusable primitives in `src/components/ui` or `src/vector/primitives`.
- Keep product-composed wrappers in `src/vector/kit`.
- Use semantic CSS variables and Tailwind utilities for layout only.
- Use `data-icon` on icons inside buttons and prefer `lucide-react`.
- Prefer `gap-*`, `size-*`, and `truncate` utilities over manual longhand classes.
- Add focused Node tests for pure utilities and compile-time coverage through `pnpm --filter @venus/ui typecheck`.
- Keep `components.json` here only; consuming apps import public entries instead
  of generating local copies.
- Document public exports in `apps/ui-docs` when adding or changing components.

## Interaction baseline

- Follow WCAG 2.2 and the WAI-ARIA Authoring Practices interaction patterns.
- Support pointer, touch, and keyboard input without making hover essential.
- Keep focus visible and interactive targets at least 24 CSS pixels.
- Respect reduced-motion, increased-contrast, and forced-colors preferences.
- Provide named loading/progress states and explicit empty, image, and error
  fallbacks.
- Let layout explain content. Add visible or screen-reader-only labels only when
  a control needs a name or the content would otherwise be ambiguous.

## Forms

- `Input`, `Select`, `Textarea`, `InputGroup`, and `NumberInput` share the
  `sm` (28 px), `md` (32 px), and `lg` (40 px) control-size contract.
- Coarse pointers raise interactive targets to at least 44 px without changing
  desktop density.
- `FieldGroup` supports one to three responsive columns. Use responsive fields
  when horizontal labels should stack on narrow screens.
- `Field` owns `default`, `success`, `warning`, and `error` validation tones and
  propagates validation and disabled state to nested controls. Error fields set
  `aria-invalid`; `FieldMessage` provides the associated human-readable status.
- Compose input actions and affordances with `InputGroup`; use `NumberInput`
  when stepping, clamping, and numeric keyboard behavior are required.
- Wrap any real interactive trigger with `WithTooltip` for optional help. Keep
  the trigger's accessible name independent from tooltip content.

## Themes and profiles

- Classic and Cartoon are semantic theme families. Each ships in light and dark
  appearances: `classic-light`, `classic-dark`, `cartoon`, and `cartoon-dark`.
- `@venus/ui/vector` is not a theme. It is a product-specific component profile
  with denser metrics, editor semantics, compatibility APIs, and its own
  light/dark `ThemeProvider`.
