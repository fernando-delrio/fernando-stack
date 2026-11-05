# readfirst

*Leer en castellano: [README.es.md](README.es.md)*

**Code is read by people first.** readfirst is a [Claude Code](https://claude.com/claude-code) plugin that packages one way of writing and refactoring code, so that every project is written the same way and a person can read it and change it without any AI.

The style has been applied and tested by rewriting whole frontends, backends and scripts with it, and a machine watches it in CI.

## What is inside

| Piece | What it is for | When it is used |
|---|---|---|
| **Skill `code-style`** | The rules: 20 rules, human reading first and how each name is written; a before and after for every rule in TypeScript and Python in `examples.md` | On its own, when writing, changing or reviewing code; or with `/readfirst:code-style` |
| **Skill `refactor`** | The refactoring.guru guide (smells, techniques, a per-file checklist) and the step-by-step method for not breaking anything | When asked to refactor or clean up code |
| **Skill `clean-ai-traces`** | Removes filler comments, emojis, banners, signatures and empty docstrings without touching the code, with a script that finds them (a folder or single files) | When asked to clean comments or "remove what smells like AI"; before showing code to a client |
| **Skill `project-structure`** | Frontend and backend folders, `docs/` organization (plan, devlog, index), branches and commits | When starting a project or deciding where something goes |
| **Skill `init-project`** | Copies the templates for the stack, installs lint and format, and creates a minimal `AGENTS.md` and `CLAUDE.md` | By hand only: `/readfirst:init-project` |
| **Agent `conventions-reviewer`** | Reviews only the session's changes (diff and new files) against the rules: a short list of violations with `file:line` and the new exceptions for you to approve. It does not edit | After writing or changing code |
| **Stop hook** (`hooks/`, **disabled**) | When a turn ends with code changes, runs the project's formatter and linter on the changed files (or a light checker if there are none) and returns whatever fails so it gets fixed | See "Enable the stop hook" |
| **Agent `craft-reviewer`** | Reviews general quality (Ousterhout, McConnell, SOLID, DRY/KISS/YAGNI…) | To find out whether something is well written |
| **Agent `backend-reviewer`** | Reviews backend security (OWASP) and scaling | After touching endpoints, authentication or queries |
| **Agent `test-writer`** | Writes and runs tests following the rules | After a feature or a fix |

Templates to copy into a new project, in [skills/code-style/templates/](skills/code-style/templates/):

| File | Where it goes |
|---|---|
| `attempt.ts` | `frontend/src/modules/core/lib/`: the only `try/catch` of the frontend |
| `attempt.py` | `backend/`: the only `try/except` of the backend |
| `eslint.config.js` and `.prettierrc` | `frontend/` |
| `ruff.toml` | Project root |
| `test_style_rules.py` | `tests/`: what Ruff cannot check (no `else`/`elif`/ternary/`match`, `except` only in `attempt.py`, 20 lines, 3 parameters, one level of blocks and exceptions with their reason) |

## The idea in ten lines

- No `else`, no ternaries, no `switch`/`match`: guard clauses, named functions and tables.
- One level of blocks per function; 20 lines and 3 parameters at most.
- Errors are caught in one place (`attempt()`), never scattered `try/catch`.
- No boolean parameters; one named state instead of several booleans.
- Named arrow functions and `export const`; no magic numbers or strings.
- Comments only explain the why.
- When refactoring, behavior does not change, and without a test nothing is touched.
- If a rule makes the code clearly harder to read, a local exception is allowed, with its reason on the same line.

## Enable the stop hook

It ships disabled: the file is called `hooks/hooks.disabled.json` and Claude Code only loads `hooks/hooks.json`.

1. Rename `hooks/hooks.disabled.json` to `hooks/hooks.json`.
2. Bump the version in `.claude-plugin/plugin.json`, commit and push, and update the plugin on each computer (see "Update").
3. Restart Claude Code. `/hooks` shows the plugin's `Stop` hook.

What it does on every turn that ends with changed code files (according to `git status`):

- **It only looks at the changed lines** relative to `HEAD` (`git diff -U0`); a new file counts whole. Old code that Claude did not touch does not count, even in the same file.
- **Repo with the rules** (it has `tests/test_style_rules.py`, or a `ruff.toml` or `eslint.config.js` that mentions `readfirst`):
  - **TypeScript/JavaScript:** if the folder has `eslint.config.*` and `node_modules/eslint`, Prettier (`--write`) and ESLint on those files; otherwise, the light checker (`hooks/light-checker.mjs`);
  - **Python:** with `ruff.toml` (or `[tool.ruff]` in `pyproject.toml`) and Ruff in `.venv`, `ruff format`, `ruff check` and `tests/test_style_rules.py` if it exists; otherwise, the light checker;
  - whatever fails **goes back to Claude** to be fixed, at most **2 times** (`MAX_ATTEMPTS`). On the third red stop, it halts and shows what is left.
- **Repo without the rules:** light checker, **formats nothing** and **does not block**: it warns you and Claude finishes.
- **Always:** that every exception has its reason and does not touch a rule that admits none (`hooks/exceptions.mjs`), and AI traces in comments (`find_ai_traces.py`).
- It does not repeat the review if the files have not changed since the last one (green, warned or given up).
- **Loops:** Claude Code's cap (8 blocks in a row) resets every time Claude uses a tool, so it does not stop a hook that makes it fix code. That is why the hook has its own per-session limit.
- **Measured time** (Windows): on a repo of 7,091 files without the rules, 0.5 to 0.8 s with up to 5 files touched and 2.2 s with 50; on a project with ESLint, Ruff and the style test, about 3 s.
- If the hook fails on its own (a Node error), it exits with code 1, Claude Code treats it as a non-blocking warning and Claude finishes anyway.

**Try it on a single project** before enabling it everywhere: do not rename `hooks.disabled.json`; add the hook to that project's `.claude/settings.local.json`, pointing at your copy of the plugin:

```json
{
  "hooks": {
    "Stop": [
      { "hooks": [{ "type": "command", "command": "node \"C:/dev/readfirst-code-style/hooks/check-on-stop.mjs\"", "timeout": 120 }] }
    ]
  }
}
```

To disable it: rename `hooks/hooks.json` back to `hooks.disabled.json` and update, or turn off all hooks with `"disableAllHooks": true` in `~/.claude/settings.json`.

If a project also has its own stop hook in `.claude/settings.json`, both run (Claude Code adds up the hooks from every source): better to keep just one.

## Install

From Claude Code:

```text
/plugin marketplace add fernando-delrio/readfirst-code-style
/plugin install readfirst@readfirst
```

Or from the terminal:

```bash
claude plugin marketplace add fernando-delrio/readfirst-code-style
claude plugin install readfirst@readfirst
```

Restart Claude Code. `/plugin` shows it installed; the skills appear as `readfirst:code-style`, etc.

**If you already had agents in `~/.claude/agents/`** (`craft-reviewer`, `conventions-reviewer`, `backend-reviewer`, `test-writer`), delete them from there once the plugin is installed, so there are no two different versions.

## Update

After changing something here and pushing it:

1. Bump `version` in [.claude-plugin/plugin.json](.claude-plugin/plugin.json) (for example `1.0.0` → `1.1.0`).
2. On each computer:
   ```bash
   claude plugin marketplace update readfirst
   claude plugin update readfirst@readfirst
   ```
   and restart Claude Code.

Before pushing, validate:

```bash
claude plugin validate .
claude plugin validate skills
claude plugin validate agents
```

## Use it in a project

The plugin works in every project as soon as it is installed. To leave it written down in each repository, add this line to its `CLAUDE.md`:

```markdown
- **Mandatory code style:** the readfirst rules (plugin `readfirst`, skill `code-style`). When refactoring, skill `refactor`; folders and documentation, skill `project-structure`.
```

If the project has its own copy of the rules, the project's copy wins and the two must say the same thing.

## Repository structure

```text
.claude-plugin/
├── plugin.json         name, version and description of the plugin
└── marketplace.json    lets it be installed with /plugin marketplace add
skills/
├── code-style/         SKILL.md + examples.md + templates/
├── refactor/           SKILL.md
├── clean-ai-traces/    SKILL.md + find_ai_traces.py
├── project-structure/  SKILL.md
└── init-project/       SKILL.md
agents/                 the four reviewer agents
hooks/                  stop hook (disabled): check-on-stop.mjs and its modules (git, tools,
                        light checker, exceptions, run and attempt)
```

To change a rule, edit the matching skill. If the rule is also watched by the machine, update its template and bump the plugin version.

## License

[MIT](LICENSE). Use it, copy it and change it freely; just keep the copyright notice.
