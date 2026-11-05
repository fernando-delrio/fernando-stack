---
name: init-project
description: Sets up a new project with the readfirst style rules already watched by the machine. Copies the ESLint, Prettier, Ruff, style-test and attempt() templates according to the stack, installs the lint and format dependencies, and creates a minimal AGENTS.md and CLAUDE.md with only what is specific to the project. Run it by hand with /readfirst:init-project when starting a repository.
disable-model-invocation: true
argument-hint: "[frontend | backend | both]"
---

# Start a project with the readfirst rules

The user is starting a new project. The goal: from the first commit, the rules are watched by the linter, the formatter and the style test, and the project's instructions say only what belongs to this project. What holds for every project is already in the user's global `CLAUDE.md` and in the `code-style` skill, and is not repeated. Requested stack: $ARGUMENTS

## Before touching anything

1. **Look at what is there** (`git status`, `ls`, `package.json`, `pyproject.toml`). If a file you are about to create already exists, do not overwrite it: show the user the difference and ask.
2. **Decide the stack:** frontend (React + TypeScript + Vite), backend (Python + FastAPI) or both. If $ARGUMENTS does not say and it cannot be deduced from the files, ask.
3. **Folders:** the ones from the `project-structure` skill (`frontend/src/modules/…`, `backend/routes|services|models|migrations`, `tests/`, `docs/`). Create them only if they are empty or do not exist.

## Frontend

The templates are in the `templates/` folder of this plugin's `code-style` skill.

1. Copy `eslint.config.js` and `.prettierrc` into `frontend/`, and `attempt.ts` into `frontend/src/modules/core/lib/`.
2. Install the development dependencies (current versions, not pinned by hand):
   ```bash
   npm --prefix frontend install -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-config-prettier globals prettier
   ```
3. Add these scripts to `frontend/package.json`:
   ```json
   "lint": "eslint .",
   "format": "prettier --write src",
   "format:check": "prettier --check src"
   ```
4. Check that they work: `npm --prefix frontend run lint` and `npm --prefix frontend run format:check` on whatever is there.

## Backend

1. Copy `ruff.toml` into the root, `attempt.py` into `backend/` and `test_style_rules.py` into `tests/`. In `test_style_rules.py`, adjust the `REVIEWED_FILES` and `ONLY_FILE_WITH_EXCEPT` paths if the folders are not `backend/` and `scripts/`.
2. Add `ruff` and `pytest` to the development dependencies (`requirements-dev.txt` or `pyproject.toml`, whichever the project uses) and install them in `.venv`.
3. Check: `.venv/Scripts/python.exe -m ruff check .` (on Linux or macOS, `.venv/bin/python`) and `python -m pytest tests/test_style_rules.py -q`.

## Project instructions

Create `AGENTS.md` in the root (read by Claude Code, Codex and other agents) with **only** this, filled in with the real data:

```markdown
# <Project name>

<One line: what it is and who it is for.>

## Before calling something done
- <exact command for the tests>
- <exact command for lint and format, frontend and backend>

## Rules of this project
- <only what cannot be deduced from the code and is not in the global rules: business rules, data that is not touched, external services>
```

And `CLAUDE.md` with a single line, so Claude Code reads the same file:

```markdown
@AGENTS.md
```

Do not copy the style rules, the folder structure or the architecture into either: the rules are already in the skill and Claude reads the code.

## Basic security

Create `.claude/settings.json` (or add to an existing one) so the agent does not read the secrets:

```json
{
  "permissions": {
    "deny": ["Read(.env)", "Read(.env.*)", "Read(!.env.example)"]
  }
}
```

And check that `.gitignore` excludes `.env`, `.venv/`, `node_modules/` and `dist/`.

## When finished

- **Never** `git add`, `git commit` or `git push`: Git belongs to the user.
- Summarize in a few lines which files you created, which check commands passed and which did not.
- Give them the commands for the first commit, for example `git add -A` and `git commit -m "chore: style rules, lint and format from the start"`.
