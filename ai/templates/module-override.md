# Module Override

Module:
- packages/<module>

Purpose:
- Module-local constraints that extend root ai docs.

Must not duplicate:
- Global workflow and governance rules.
- Global command catalog.

Local ownership:
- Main responsibilities:
- Explicit non-responsibilities:

Critical entry points:
- Primary factories:
- Runtime orchestrators:
- Public API/barrel files:

Allowed local dependencies:
- Internal modules:
- External packages:

Forbidden local dependencies:
- Cross-layer restrictions:
- Private deep-import restrictions:

High-risk paths:
- Rendering/async/state-transition hotspots:
- Compatibility branches:

Validation add-ons:
- Extra module-specific checks:
- Required test suites:

Notes:
- Keep this file short and executable.
- Use references to root ai files for common rules.
