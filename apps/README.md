# Apps

An app is a runnable/deployable product with its own `package.json`.

| App | Purpose |
| --- | --- |
| `vector-editor-web` | Main vector editor product |
| `engine-docs` | Engine documentation and examples |

Apps own UX, workflows, routing, commands, persistence policy, and composition.
They may consume packages but must not import another app or duplicate reusable
engine mechanisms. A product-idea directory without `package.json` is not an
active workspace app and should not be listed as one.
