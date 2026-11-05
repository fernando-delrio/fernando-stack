---
name: project-structure
description: Folder structure, documentation and working method for projects that follow the readfirst rules (React frontend by modules, Python backend by layers, docs with a plan and a devlog, branches and commits). Use it when starting a new project, creating files or folders, deciding where something goes, writing documentation or preparing branches and commits.
---

# Project structure

## Frontend (React + TypeScript + Vite)

```text
frontend/src/
├── routes.tsx                 all the routes in one place, as a table
├── main.tsx                   only mounts the app
├── assets/                    styles
└── modules/
    ├── core/                  what is shared between features
    │   ├── components/        buttons, notices, shared layout
    │   ├── hooks/
    │   ├── services/          the only API client (headers, session, errors)
    │   └── lib/               utilities and attempt.ts (the only try/catch)
    └── <feature>/             auth, orders, shop… 
        ├── components/        view: only renders, receives everything from the hook
        ├── hooks/             orchestration: state, effects, attempt() and messages
        ├── services/          API: fetch, checks the response and throws Error if it fails
        ├── lib/               model: transforms and sanitizes data; configuration tables
        └── types.ts           the feature's types
```

- **No component calls `fetch`.** That path is always view → hook → service.
- **A feature does not import from another.** What they share moves up to `core/`.
- **One file per component.** If a component has modals inside, each modal goes in its own file with its own hook.
- **Tests go next to the hook** (`useSomething.test.ts`). Shared test setup (MSW server, router wrapper) goes in `src/tests/`.
- **Static files** (logo, icons) in `frontend/public/`.

## Backend (Python, FastAPI)

```text
backend/
├── main.py           composes the app: routes, middleware and exception handlers (named errors → HTTP)
├── attempt.py        the only place that catches errors
├── dependencies.py   what routes share (session, database)
├── routes/           one folder or file per feature: they only receive, call the service and respond
├── services/         the logic and data access; SQL queries as named constants
├── models/           Pydantic models: they validate at the boundary
└── migrations/       001_xxx.sql, 002_xxx.sql… a new migration per change; never edit an applied one
scripts/              one-off tasks (tests, backups, startup); same rules as the backend
tests/                pytest against an isolated database, plus test_style_rules.py
```

- **A route does not validate, query and format at once:** validation goes in the model and the logic in the service.
- **A single replica** while there is local state (queues on disk, in-memory limits). If you scale, that changes first.

## Repository root

```text
README.md            what it is, how to start it and a link to the docs index
CLAUDE.md            project rules for Claude: plan, devlog, tests and style
package.json         `npm run dev` starts the whole development environment with concurrently
.env.example         all the variables, without secret values
ruff.toml            rules for Python
.github/workflows/   CI: tests, lint, format, the style test and build
```

- **One development environment and one command:** `npm run dev` brings up the backend, the panel and whatever else is needed (tunnel, etc.). If one piece goes down, all of them stop (`--kill-others`): nothing is left running hanging from another terminal.
- **Tool templates** (ESLint, Prettier, Ruff, the style test and `attempt`): in the `code-style` skill, `templates/` folder.

## Documentation (`docs/`)

Ordered by **what it is for**, with numbers that mark the reading order:

```text
docs/
├── README.md          index: overview, an "if you want to…, look at…" table and where each new document goes
├── 1-daily/           starting the project; a handoff to continue from another computer
├── 2-plan/            PLAN.md, DEVLOG.md, test plan and acceptance criteria
├── 3-business/        what depends on others: questions, access, pending messages
├── 4-technical/       architecture and, if the project copies it, the style rules
├── 5-<integration>/   each important external service (for example 5-payments/)
├── 6-production/      from development to production, operation, backups
├── 7-future/          ideas for later
└── archive/           what has been replaced, with a notice at the top and what replaced it
```

- **`PLAN.md`** is the single plan. At the top it has "How to read this plan" and the state of the day. **Everything done or verified is marked at that moment** with `[x]` and the date (YYYY-MM-DD). If something is only scheduled and has not really been tested, the line says so. What is discarded is struck through (`~~like this~~`), with the reason.
- **`DEVLOG.md`** keeps the decisions and their why, **from newest to oldest**. Each entry starts with `## YYYY-MM-DD — Title (who)` and explains the problem, the decision, the why and what was verified.
- **No to-do lists by day are created:** what is pending lives in `PLAN.md`.
- **A document that stops being valid goes to `archive/`,** it is not deleted.
- **Never in `docs/`:** secrets, passwords or personal data.
- **Written for someone who was not in the conversation.**

## Working method

- **Branches named for the work, not for who does it:** `feature/…`, `fix/…`, `docs/…` or `refactor/…`. Never `claude/` or `codex/`.
- **Commits and pushes belong to the user.** The AI prepares the changes and gives them the commands (`git add`, `git commit -m "…"`, `git push -u origin <branch>`) to run themselves.
- **Pull request with green CI** before merging into `main`.
- **Commit messages** with a prefix: `feat:`, `fix:`, `docs:`, `refactor:`, `ci:`, `test:`.
- **Before deleting or overwriting anything, look at what is there.**
