# Release API Baseline

Status: Release candidate baseline.
Scope: ENG-002.

This page defines the first commercial documentation baseline for `@venus/engine` consumers. The preferred integration entry is `createEngine(options)`, followed by the stable handle namespaces `engine.*`, `engine.runtime.*`, `engine.capability.*`, and `engine.events.*`.

## Stable Consumer Surface

- `createEngine(options)` creates an engine handle.
- `engine.resize(width, height)` resizes the surface using numeric dimensions.
- `engine.getView()` returns the current view state.
- `engine.runtime.*` owns graph/document compilation and submission APIs.
- `engine.capability.*` owns optional runtime capabilities.
- `engine.events.*` owns lifecycle, diagnostics, render, replay, query, and resource events.

## Internal-Adjacent Surface

The broad layer-root exports from `backend`, `kernel`, `platform`, `orchestration`, and `optimization` remain available for current compatibility, but they are not the preferred app-consumer API. Governance helpers such as `createEngineProductAdapterBoundaryModule` and `createEnginePublicApiSurfaceModule` are release-governance surfaces, not normal runtime integration APIs.

## Required Consumer Rule

Applications must use public package exports only. Product semantics must live in app adapters, not inside engine API names.
