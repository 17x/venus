# Mindmap Editor App

Product app shell for a mindmap/outliner editor experience.

## Folder Guide

- `src/app`: app entry, composition, providers
- `src/features`: product-specific feature modules
- `src/platform`: platform adapters (web/desktop bridge)
- `src/state`: app-level state wiring
- `src/workflows`: high-level editor workflows and orchestration

This app should remain thin and reuse shared logic from `packages/*`.
