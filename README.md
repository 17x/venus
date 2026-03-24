# venus

Venus is a vector application leveraging a monorepo architecture to support multiple clients such as web and desktop apps. The monorepo promotes code reuse and easier maintenance by centralizing shared logic, components, and utilities.

## Features

- 🗂 **Monorepo Organization:** All packages and applications are managed together for unified workflows.
- 🧩 **Reusable Libraries:** Centralized, shareable code for vector operations, UI components, utilities, and more.
- 💻 **Multi-Platform Ready:** Supports seamless development for both web and desktop (Electron or other frameworks).
- ⚡ **Modern Tooling:** Compatible with contemporary build tools and developer environments for efficient iteration.

## Getting Started

1. **Clone the repository:**
  ```sh
   git clone https://github.com/17x/venus.git
   cd venus
  ```

## Monorepo Structure Example



```
venus/
├── packages/
│   ├── core/         # Shared vector logic and models
│   ├── ui/           # Reusable UI components
│   ├── utils/        # Utility functions
│   ├── history/      # Undo/redo history management
│   ├── icons/        # SVGs and icon components
│   ├── theme/        # Theme and styling utilities
│   ├── types/        # Shared TypeScript types and interfaces
│   └── config/       # Shared build and app configuration
├── apps/
│   ├── web/          # Web client implementation
│   └── desktop/      # Desktop client (e.g., Electron)
├── .gitignore
├── package.json
└── README.md
```

## License

This project is licensed under the MIT License – see the [LICENSE](./LICENSE) file for details.

---

