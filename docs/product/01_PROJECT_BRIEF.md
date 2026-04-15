# 01_PROJECT_BRIEF.md

## Project Name

Venus Editor Runtime

## One-line Summary

A reusable web-based editor runtime for building interactive 2D editing applications, with a documentation-first workflow designed for long-term AI-assisted development.

## Background

This project is initiated to build a reusable editor foundation rather than a one-off application. The goal is not only to make a usable editor demo, but to establish a long-term architecture that can support future editing products, runtime evolution, and team collaboration.

The project is being developed in a monorepo structure and relies heavily on AI-assisted iteration for product thinking, architecture design, documentation refinement, and implementation support. Because the development process is long-running and highly iterative, project knowledge must be written back into structured documents instead of being trapped in chat history.

## Problem Statement

Typical AI-assisted development workflows have several problems:

- key decisions are often made in conversation but never written into formal project docs
- new AI sessions and new collaborators cannot quickly understand current project state
- architecture discussions, product scope, and implementation direction easily drift apart
- documentation becomes fragmented across chats, notes, README files, and design artifacts
- reusable editor architecture is hard to stabilize without clear module boundaries and decision records

For an editor-related project, this problem is even more serious because rendering, interaction, state management, history, document model, and future extensibility are tightly connected.

## Goal

The goal of this project is to build a reusable editor runtime and supporting workflow that:

- supports common 2D editing capabilities in the browser
- separates reusable editor infrastructure from app-specific business logic
- works well in a monorepo with clear package boundaries
- supports long-term iteration without losing context
- allows AI and human collaborators to quickly continue work from project documents
- establishes a documentation system that can act as the source of truth during development

## Target Users

### Primary Users

- the project owner as the main builder and architect
- future collaborators who need to join the project quickly
- AI agents used for documentation, design support, and engineering support

### Secondary Users

- developers who may later build product-specific editors on top of the runtime
- designers or reviewers who need to understand the relationship between product requirements, editor capabilities, and implementation direction

## Core Value

This project provides two layers of value:

1. A reusable editor runtime for web-based 2D editing scenarios.
2. A structured development workflow that reduces context loss in long-term AI-assisted software development.

## Main Use Cases

- build and iterate on a reusable 2D editor runtime
- support shapes, paths, text, images, layer-related editing, and transform interactions
- define stable boundaries between runtime, rendering, input, history, and document model
- document architecture and decisions clearly enough for future reuse and onboarding
- allow new AI sessions to continue work from project documents instead of relying on past chat context

## Current Scope Focus

The current focus is on the editor foundation rather than complete end-user product polish.

Priority areas include:

- runtime architecture
- package boundaries in the monorepo
- rendering and interaction model
- transform and selection behaviors
- history / command / tool lifecycle design
- documentation workflow for AI-assisted development
- project handoff and knowledge capture

## Success Metrics

The project will be considered successful at this stage if:

- the editor runtime architecture is clearly documented
- major module responsibilities are stable and understandable
- important decisions are traceable from documents
- new AI sessions can continue work with limited repeated explanation
- the monorepo structure supports incremental package-level growth
- core editing interactions are working in a reusable way
- documentation no longer depends on a single long-running conversation

## Constraints

- development is primarily driven by one main builder
- AI is used heavily, so documentation quality and handoff clarity are critical
- the system should remain reusable and not become too tightly coupled to one specific app
- the project must stay maintainable as packages grow
- not every feature should be implemented early if it harms architecture clarity
- the workflow should fit local markdown, Git, and Obsidian-based knowledge management

## Non-goals

At the current stage, the project is not trying to become:

- a fully polished commercial product
- a full Figma alternative
- a complete multi-user collaboration platform from day one
- a final and frozen architecture with no future refactoring
- a documentation system that depends on proprietary online-only tools

## Why Monorepo

A monorepo is used to make responsibilities more explicit and to support long-term package separation. The project is expected to contain multiple apps and reusable packages such as editor core, rendering layers, geometry, history, input handling, and related utilities.

This structure is intended to make the system easier to evolve, test, document, and hand off over time.

## Why Documentation Matters in This Project

Documentation is not treated as optional support material. It is part of the development system itself.

This project depends on documentation to:

- preserve decisions
- keep scope aligned with implementation
- reduce repeated explanation across sessions
- support future onboarding
- make AI-assisted iteration more stable and less fragile

## Current Phase

Architecture definition, documentation system setup, and reusable editor foundation refinement.

## Open Questions

- how strict the runtime boundary should be between engine and business-side document logic
- how tool lifecycle and command lifecycle should be formalized
- how hit testing should evolve for overlapping objects and disambiguation
- how much of selection / overlay / handles should live inside the engine versus outside
- how to balance reusability and performance as scene size grows
- how far the first public demo should go before broader packaging or promotion
