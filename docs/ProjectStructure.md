# CapaCity Project Structure

This document outlines the proposed monorepo structure for the CapaCity project, housing the Next.js frontend and Node.js backend together.

```plaintext
/AirportCapacityPlanning/           # Workspace Root
|
├── docs/                     # Project documentation
│   ├── architecture.md       # High-level architecture diagram and description
│   ├── ProjectStructure.md   # This file
│   └── components/           # Detailed component breakdowns
│       └── MVP/              # MVP Specific Components
│           ├── AirportDefinition.md
│           ├── ApiLayer.md
│           ├── CapacityConfiguration.md
│           ├── StandCapacityEngine.md
│           └── UserInterface.md
│
├── packages/                 # Main application code (managed via workspaces)
│   ├── frontend/             # Next.js application (User Interface)
│   │   ├── components/       # Reusable React components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utility functions, API client
│   │   ├── pages/            # Next.js page routes
│   │   ├── public/           # Static assets
│   │   ├── styles/           # Global styles, CSS modules
│   │   ├── tsconfig.json     # TypeScript config (frontend)
│   │   ├── next.config.js    # Next.js config
│   │   └── package.json      # Frontend dependencies
│   │
│   └── backend/              # Node.js/Express application (API, Services, Engine)
│       ├── src/              # Backend source code
│       │   ├── api/            # API Layer (routes, controllers, middleware)
│       │   │   ├── routes/
│       │   │   ├── controllers/
│       │   │   └── middleware/
│       │   │
│       │   ├── components/     # Backend component logic (services, engine)
│       │   │   ├── airport-definition/
│       │   │   ├── capacity-configuration/
│       │   │   └── stand-capacity-engine/
│       │   │
│       │   ├── config/         # App configuration (db, env vars)
│       │   │   ├── database.ts   # PostgreSQL connection configuration
│       │   │   └── env.ts        # Environment variables
│       │   │
│       │   ├── database/       # DB interaction (direct PostgreSQL)
│       │   │   ├── connection.ts # PostgreSQL connection setup
│       │   │   ├── queries/      # SQL query files organized by entity
│       │   │   └── helpers.ts    # Query builder/helper functions
│       │   │
│       │   ├── utils/          # Backend utility functions
│       │   └── server.ts       # Main server entry point
│       │
│       ├── tsconfig.json     # TypeScript config (backend)
│       └── package.json      # Backend dependencies
│
├── database/                 # Root level database management
│   ├── migrations/           # Raw SQL migration files 
│   ├── schema.sql            # Full database schema
│   └── init.sql              # Initial database setup
│
├── .gitignore                # Git ignore rules
├── package.json              # Root package.json (workspaces config, root scripts)
├── tsconfig.base.json        # (Optional) Base TS config shared across packages
└── README.md                 # Project overview, setup instructions
```

**Key Points:**

*   **Monorepo:** Uses a single repository containing multiple packages (`frontend`, `backend`). Often managed with tools like npm/Yarn/pnpm workspaces or Turborepo/Nx.
*   **Separation:** Clear separation between frontend code (`packages/frontend`), backend code (`packages/backend`), database migrations (`database/`), and documentation (`docs/`).
*   **Backend Structure:** Organizes backend code by layer (`api`, `components`, `database`, `config`) and feature/component within the `components` directory.
*   **Database:** Uses direct PostgreSQL connections without ORM, with raw SQL queries organized by entity, and simple migration files.
*   **Root Configuration:** Allows for shared tooling configuration (e.g., `tsconfig.base.json`) and global scripts in the root `package.json`.
