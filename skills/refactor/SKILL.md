---
name: refactor
description: A refactoring guide (based on refactoring.guru) and the method for applying it without breaking anything. Use it when asked to refactor, clean up, tidy or bring code to the readfirst style rules, or when code smells show up in a review (long functions, nested ifs, duplicated code, too many parameters, switch, scattered catch).
---

# How to refactor

## The golden rule

**Refactoring is changing the structure of the code without changing its behavior.** If what it does changes, it is no longer refactoring: it is rewriting or adding a feature.

## How to do it well

- **Tests first.** Without tests that pass before and after, you do not know whether you broke something. If the piece you are about to touch has no tests, they are written before changing it.
- **Small steps.** One change, the tests, one commit. And again.
- **Do not mix refactoring with features.** They go in separate commits or PRs.
- **The code must end up cleaner, not just different.** If it does not improve readability or maintainability, it is not touched.

## When to refactor

- **Rule of three:** the first time you do it, the second time you duplicate it with some reluctance and the third time you refactor.
- Before adding a feature, if the current code makes it hard.
- When fixing a bug, if it was hidden by confusing code.
- In code review.

## The method

1. **Its own branch:** `refactor/<what-is-being-tidied>`, cut from an up-to-date `main`. Never `claude/` or `codex/` in the name.
2. **The suite green before starting.** Note how many tests pass: that number cannot go down.
3. **First, the tools that watch the rules:** ESLint and Prettier on the frontend, and Ruff and the style test in Python (templates in the `code-style` skill). That way the machine says what is missing, instead of memory. Count how many violations there are at the start.
4. **Then, the code, module by module,** with the tests green and a commit after each module.
5. **When the output matters byte for byte** (a PDF, a CSV, an API response), save the output from before and compare it with the one from after. For example, a PDF that comes out identical for every kind of order.
6. **Behavior changes that turn up** (an error that was being swallowed, a validation that was missing) are not fixed on the quiet: they are noted and done in a separate step, or you ask.
7. **When finished:**
   - lint, format and tests green;
   - in the project plan, the task marked `[x]` with the date;
   - in the devlog, the why of the decisions;
   - leave the commits to the user: give them the commands instead of running Git.
8. **To review the result:** the `conventions-reviewer` agent (the rules) and the `craft-reviewer` agent (general quality).

Changes that touch almost all the tests (for example, renaming the functions of the whole backend) go in their own step and branch.

## What to look for: the *code smells*

**Bloaters**
- **Long Method:** long functions. If you need a comment to explain a block, that block is a function.
- **Large Class:** the class or module does too many things.
- **Primitive Obsession:** loose strings or numbers where there should be an object or an enumeration, such as `"pending"`-style statuses scattered around the code.
- **Long Parameter List:** more than 3 parameters.
- **Data Clumps:** the same data always travels together (for example `user_id`, `tenant_id` and `role`), so it should be an object.

**Object-Orientation Abusers**
- **Switch Statements:** long `if`/`elif` or `switch` on a type. They usually call for a table of functions or polymorphism.
- **Temporary Field:** attributes that only have a value sometimes.
- **Refused Bequest:** the subclass inherits things it does not use.
- **Alternative Classes with Different Interfaces:** two classes do the same with different methods.

**Change Preventers**
- **Divergent Change:** one module changes for many different reasons.
- **Shotgun Surgery:** one change forces you to touch 10 files.
- **Parallel Inheritance Hierarchies:** creating a subclass forces you to create another in parallel.

**Dispensables**
- **Duplicate Code.**
- **Dead Code:** code nobody calls.
- **Lazy Class:** the class does not do enough to exist.
- **Speculative Generality:** abstractions "just in case".
- **Comments that cover up bad code.**
- **Data Class:** only data, no behavior.

**Couplers**
- **Feature Envy:** a function uses more data from another module than from its own.
- **Inappropriate Intimacy:** two modules dig into each other's internals.
- **Message Chains:** `a.b().c().d()`.
- **Middle Man:** a class or module that only delegates.

## Techniques: how to fix it

| Group | Techniques |
|---|---|
| Composing methods | Extract Method / Inline Method · Extract Variable (name complex expressions) · Replace Temp with Query · Replace Method with Method Object (for monster functions) |
| Moving responsibilities | Move Method / Move Field · Extract Class / Inline Class · Hide Delegate / Remove Middle Man |
| Organizing data | Replace Magic Number with Symbolic Constant · Replace Type Code with Class / Subclasses / State-Strategy · Encapsulate Field / Encapsulate Collection · Replace Data Value with Object |
| Simplifying conditionals | Decompose Conditional (extract the condition and the branches into named functions) · Consolidate Conditional Expression · Replace Nested Conditional with Guard Clauses · Replace Conditional with Polymorphism · Introduce Null Object |
| Simplifying calls | **Rename Method** (the most underrated) · Introduce Parameter Object / Preserve Whole Object · Separate Query from Modifier (a function returns data or changes state, not both) · Replace Error Code with Exception |
| Generalization | Pull Up / Push Down Method · Extract Superclass / Extract Interface · Replace Inheritance with Delegation (composition over inheritance) |

With the readfirst rules, two techniques take their own form:
- **Switch Statements and Replace Conditional with Polymorphism:** first try **a table** (an object or dictionary of values or functions); classes only if the table is not enough.
- **Replace Error Code with Exception:** the service throws a named error and whoever orchestrates catches it with `attempt()` (rule 17). Never a `catch` in the middle of the code.

## Quick checklist per file

- [ ] Are there functions of more than 20 lines? → Extract Method.
- [ ] Are there names that do not explain what they do? → Rename.
- [ ] Is there duplicated code? → Extract and reuse.
- [ ] Are there `if`s nested 3 or more levels deep? Any `else`? → Guard clauses.
- [ ] Is there a `switch`, a `match` or a chain of `if`s on a value? → Table.
- [ ] Is there a `catch` or an `except` outside `attempt`? → `attempt()` and a guard.
- [ ] Are there magic strings or numbers? → Constants or enumerations.
- [ ] Does any function take 4 or more parameters? → Parameter Object: in Python, a `dataclass` or a Pydantic model; in TypeScript, a named type.
- [ ] Does any module mix responsibilities, like an endpoint that validates, queries the database and formats? → Extract Class or split into layers.
- [ ] Is there dead or commented-out code? → Delete it; that is what git is for.
