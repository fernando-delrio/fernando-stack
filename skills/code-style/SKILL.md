---
name: code-style
description: The readfirst style rules for writing, changing or reviewing code (TypeScript/React and Python). Use it whenever you write, change, refactor or review code, even if the user does not name it. Human reading first; no else or ternaries; no switch/match; one level of blocks; arrow functions and export const; errors only in attempt(); short functions; meaningful names; no boolean parameters; comments only for the why; when refactoring, behavior does not change and without a test nothing is touched.
---

# The readfirst style rules

**What they are for:** all the code is written the same way so that a person can read it, understand it and change it alone, even on a day when no AI is available. **They are mandatory** for new code and for code that gets refactored, whether a person or an AI writes it.

If the project has its own copy of the rules (for example `docs/…/CODE_STYLE.md`), the two say the same thing; if they ever clash, the project's copy wins and the two should be brought back in line.

Each rule has its **before and after** in TypeScript and Python in [examples.md](examples.md).

## First: a person has to read it comfortably

The rules exist to make code easier to read, always within these principles. If in a specific case following a rule makes the code **clearly** harder to read, a local, explicit exception is allowed, with the reason on the same line:

- TypeScript: `// eslint-disable-next-line max-depth -- <reason>`
- Python: `# style: allow depth -- <reason>` (`depth`, `lines` or `params` are valid) and, for Ruff, `# noqa: N802 -- <reason>`

The exception is also explained in the reply, and the `conventions-reviewer` agent lists all the new ones so a person can approve them.

**No exception is allowed** for these, because the rules always give a readable alternative: `else`, ternaries, `switch`/`match`, `try/catch` outside `attempt`, `function` and `export default` (except in the configuration files where the tool requires it, such as `eslint.config.js` or `vite.config.ts`).

## The 20 rules

1. **`const` always.** No `var`; `let` only in two cases: the counter of an indexed loop when there is no declarative way, and the cancel flag inside a `useEffect`. **And what is inside is not changed either:** `const` prevents reassignment but does not protect the contents of a list or an object. To modify them, a new one is created (`[...list, item]`, `{ ...object, field: value }`); never `push`, `splice` or assigning to a field. The exception is `ref.current`, which exists for that. Spread copies one level only; for anything nested, `structuredClone`.
2. **Named arrow functions**, never `function`: `const submitForm = async (event) => { … }`.
3. **The name explains what it does.** Verb + object for functions (`loadOrders`, `calculateInvoiceTotal`); booleans, as in "Booleans" below. Never `T`, `x`, `fn`, `data`, `res` or abbreviations (`usr`, `tmp2`, `data1`), not even in TypeScript generics (`<Response>`, not `<T>`). The test: can it be understood in two months without reading the body? The format of each name is in "How each name is written", below.
4. **No `else` or ternaries.** Leave early with guard clauses (`if (…) return`) or extract a named function. A ternary (`c ? a : b`, `a if c else b`) is a hidden `else`: replace it with a function with guards or a table.
5. **Few `if`s.** What changes with a value goes in a **table** (Strategy pattern), not in a chain of `if`s.
6. **In JSX, named guards chained with `||`**, no `if` or ternaries. `condition && <Something />` is still fine.
7. **Each layer does one thing:** the component renders, the hook orchestrates, the service talks to the API and the library transforms data.
8. **Organize by feature** (`modules/<feature>/components|hooks|services|lib`); what is shared goes in `core/`. The detail is in the `project-structure` skill.
9. **API data is sanitized at the boundary**, with default values, before it reaches the view. The default is set with `??`, which only applies when the data is missing (`null` or `undefined`). `||` also applies for `0`, `''` and `false`: use it only when those values are useless too (an empty name), never for numbers or booleans, because a distance of 0 or a `false` would be lost.
10. **Declarative before imperative.** In TypeScript, `map`/`filter`/`reduce` instead of `for`/`while`. In Python, comprehensions, `sum`, `any`, `all`, `filter` or `map` when the result is a value (a list, a total, a yes or no). A `for` is fine when the body is an action with effects (send, write, delete) and no value is built: a comprehension is not used to do things. In both languages, the loop stays only if it is the clearest option.
11. **Comments only for the why**: a business rule, an external constraint, a known library bug or a non-obvious decision. Never repeat what the line does, explain the change ("Added this to fix…", "Now we use…"), emojis, separators or file summaries. If you feel like commenting what something does, change the name or extract a function. Docstrings only on public or API functions, and without repeating the signature.
12. **Test the hook, not the component**, with the Arrange-Act-Assert structure. Fixed bugs are noted in a lessons-learned log.
13. **Always `export const`**, also on page components. No `export default` (except where a tool requires it).
14. **Language:** names in English (`order`, `employee`, `markDone`, `useShopPanel`, `isSending`, `handleTakeOrder`), with the usual React and JavaScript terms (`useState`, `useEffect`, `props`, `children` and the prefixes `use`, `is`, `has`, `handle`, `on`). Comments and docs, in the language of the team.
15. **In Python, the same rules that fit:** guards, no `else`, `elif` or ternary, dictionaries instead of chains of `if`, meaningful names, small functions and one responsibility per function. Declare with `def`, because Python has no arrow functions; `lambda` only for one-line expressions.
16. **Never `switch` (JavaScript) or `match` (Python).** What changes with a value goes in a table: an object or a dictionary of values or functions.
17. **Never scattered `catch` or `except`.** Errors are caught in **a single place per layer**:
    - **Frontend:** `core/lib/attempt.ts` turns any error into a `{ value, error }` outcome, and the rest of the code decides with guards (`if (error) return …`). No other file uses `try`, `catch` or `.catch()`.
    - **Backend:** `attempt.py` does the same with an `Outcome(value, error)` and forces you to say which errors are expected. The rest reach the app's exception handlers (in FastAPI, the ones in `main.py`), which turn named errors into HTTP responses. `try/finally` to close resources is allowed, because it does not catch errors.

    Reference implementations: [templates/attempt.ts](templates/attempt.ts) and [templates/attempt.py](templates/attempt.py).
18. **No boolean parameters.** `book(customer, true)` does not say what the `true` does: split it into two named functions (`bookPremium`, `bookStandard`). It is Martin Fowler's rule in *FlagArgument* (2011): "My general reaction to flag arguments is to avoid them".
19. **One named state instead of several booleans.** `isLoading`, `isReady` and `isError` together allow impossible combinations; a single `status: 'loading' | 'ready' | 'error'` (a union type in TypeScript, `Literal` or `Enum` in Python) does not.
20. **No magic numbers or strings.** Named constants (`VAT_RATE = 0.21`, `MAX_RETRIES = 3`), and abstractions only when there are at least two real uses: no interfaces "just in case".

**Limits that a machine checks** (they come from the refactoring guide):
- functions of **20 lines** at most (40 for React components, because they count the JSX);
- **3 parameters** at most; with more, a named object (Parameter Object: a type in TypeScript; a `dataclass` or a Pydantic model in Python);
- **one level of blocks** (`if`, `for`, `while`, `try`, `with`) inside a function; what needs a second level goes to another function;
- no ternaries, and names of 2 letters or more.

## How each name is written

If the repository already has another convention, the repository's convention is respected.

| What | Format | Example |
|---|---|---|
| Components, classes, types, interfaces and enums (TS) | PascalCase | `OrderCard`, `OrderStatus`, `OrdersRepository` |
| Variables, functions, methods and properties (TS) | camelCase | `pendingOrders`, `calculateTotal`, `fullName` |
| Global constants whose value is known when the code is written | UPPER_SNAKE_CASE | `MAX_RETRIES`, `API_URL` |
| Python: functions, variables and modules | snake_case | `calculate_invoice_total`, `pending_orders` |
| Python: classes · constants | PascalCase · UPPER_SNAKE_CASE | `Outcome` · `ROWS_PER_PAGE` |
| SQL: tables and columns | snake_case | `orders`, `assigned_to` |
| CSS: classes · URL paths | kebab-case | `.order-card` · `/pending-orders` |
| Environment variables | UPPER_SNAKE_CASE | `DATABASE_URL` |
| JSON and API keys | the ones the contract sets; if there is none, the backend language's | `assigned_to` |
| Files | named after what they export | `OrderCard.tsx`, `useOrderAlerts.ts`, `accessService.ts`; in Python, `orders_repository.py` |

**Rule of thumb:** if it is instantiated or rendered, PascalCase; if it is executed or stored, camelCase; if it is a fixed value, UPPER_SNAKE_CASE.

### Booleans

Better to avoid them: no boolean parameters (rule 18) and one named state instead of several booleans (rule 19). When one is needed, it is named as a positive statement with one of these prefixes:

| Prefix | For | TypeScript | Python |
|---|---|---|---|
| `is` | a state or a quality | `isSending`, `isUrgent` | `is_sending`, `is_urgent` |
| `has` | having something | `hasLines`, `hasNewOrders` | `has_lines` |
| `can` | a permission or a capability | `canCancel` | `can_cancel` |
| `should` | a decision that will be made | `shouldRetry` | `should_retry` |

Never negative (`isNotValid`, `isWithoutStock`): `isValid` and `isSoldOut`, and negate with `!` or `not`. This is how Airbnb (rule 24.3, `isVal()`/`hasVal()`), Google JavaScript (6.2.3, `isFoo`/`hasFoo`), Microsoft .NET (positive phrase; `Is`, `Can` or `Has` where useful), typescript-eslint (`is`, `should`, `has`, `can`) and, in Python, Django (`is_active`, `has_perm`) and `pathlib` (`Path.is_file()`) do it. The `conventions-reviewer` agent watches it, not ESLint: checking it with ESLint requires giving it the project's types.

## What each rule looks like

### Functions and names

```ts
const assertInsideProvider = (context: SessionContext | null) => {
  if (!context) throw new Error('useSession must be used inside <SessionProvider>')
}

export const useSession = () => {
  const context = useContext(SessionContext)
  assertInsideProvider(context)
  return context
}
```

Conditions are named instead of being left raw:

```ts
const isSessionExpired = response.status === 401
const isAlreadyOnLogin = window.location.pathname === LOGIN_PATH
if (isSessionExpired && !isAlreadyOnLogin) goToLogin()
```

### Fewer `if`s, no `else` or ternary (five techniques, in order of preference)

**a) Guard: leave early.**
```ts
const request = async (path: string) => {
  const response = await fetch(path)
  if (response.status === 204) return null
  assertResponseIsOk(response)
  return response.json()
}
```

**b) The check, in a named function** (`assertX`, `isX`). The `if` ends up inside a one-line function and the main code reads straight through. It is also what replaces a ternary:
```python
def notice_code(outcome):
    if outcome.error:
        return outcome.error.code
    return "updated"
```

**c) Validations as a list of guards that return the first error:**
```ts
const validationError = (form: Form) => {
  if (isEmpty(form.name)) return 'The name is required'
  if (form.pin.length !== PIN_LENGTH) return 'The PIN has 4 digits'
  return null
}
```

**d) A table instead of `if`/`switch` (Strategy):**
```ts
// Everything that depends on the status is here; a new status is one more line.
export const CONFIG_BY_STATUS = {
  new: { label: 'New', next: 'in_progress', buttonText: 'Take' },
  in_progress: { label: 'In progress', next: 'done', buttonText: 'Mark done' },
} as const
export const configOfStatus = (status: Status) => CONFIG_BY_STATUS[status] ?? CONFIG_BY_STATUS.new
```

In Python, the same with a dictionary:
```python
ACTIONS = {
    "take": take_order,
    "release": release_order,
    "done": mark_done,
}


def apply_action(name, order):
    action = ACTIONS.get(name)
    if action is None:
        raise UnknownAction(name)
    return action(order)
```

**e) In JSX, named guards chained with `||`.** Each guard returns the JSX that applies or `false`, and the first one that returns something wins:
```tsx
const loading = ({ isLoading }: Session) => isLoading && <Notice text="Checking session..." />
const noSession = ({ user }: Session) => !user && <Navigate to="/" replace />

export const ProtectedRoute = () => {
  const session = useSession()
  return loading(session) || noSession(session) || <Outlet />
}
```

To do something only if a condition holds: `user?.role && navigate('/shop')`.

### One level of blocks

A level is each block (`if`, `for`, `while`, `try`, `with`) inside another one within the same function. What needs a second level is moved to another function or solved in a declarative form:
```python
def notify_urgent(orders):
    for order in filter(is_urgent, orders):
        send_notice(order)
```

### Errors in a single place

`attempt()` wraps what can fail and, instead of throwing the error, returns a box with two slots (`value` and `error`), only one of which is filled. Then you decide with a guard, like with any other data:
```ts
// Hook (orchestrates): requests, decides with a guard and turns it into state.
const loadOrders = async () => {
  const { value, error } = await attempt(ordersService.list())
  if (error) return setMessage(error.message)
  setOrders(value)
}
```

```python
outcome = attempt(lambda: read_token(token), ValueError)
if outcome.error:
    return None
```

The service **throws** (`throw new Error(...)` / `raise NamedError(...)`); whoever orchestrates **catches it with `attempt`**; the view never sees an exception. In Python you have to say which errors are expected: one that was not expected is not swallowed silently, it continues to the app's handlers, which log it.

### API data: sanitized on the way in

```ts
const safeList = <Item>(value: unknown): Item[] => {
  if (!Array.isArray(value)) return []
  return value
}

const sanitizeOrder = (raw: RawOrder, position: number): Order => ({
  id: raw?.id ?? `order-${position}`,
  customer: raw?.customer || 'No name',
  isUrgent: Boolean(raw?.urgent),
})

export const panelModel = (raw: RawPanelResponse) => ({
  orders: safeList<RawOrder>(raw?.orders).map(sanitizeOrder),
})
```

The view never receives an unexpected `null`. Each field has its default value in a single place. `id` uses `??` because it only has to be invented if it does not come; `customer` uses `||` because an empty name is useless too.

### Without mutating

```ts
const addPoint = (points: Point[], point: Point) => [...points, point]

// The function that setPoints receives only computes the new list: it does not draw, request or move anything.
setPoints((previous) => addPoint(previous, point))
```

### Comments

Explaining **the why**:
```ts
// Here and not in every service: there are 17 services with their own fetch, and this way a 401
// is handled the same in all of them without touching them one by one.
```
No banners or decorative separators (`// ── Requests ──`, `# =====`): if a file needs sections, it needs splitting. To remove filler comments, emojis and other AI traces, use the `clean-ai-traces` skill.

### Tests

- **The hook, with `renderHook`**, not the component: if the hook works, the component renders fine.
- **Vitest + Testing Library + MSW** on the frontend, with the mocks pointing at the same base URL as the code. **pytest** on the backend, against an isolated test database (never the development one).
- **Success case and error case** for every hook or endpoint.
- **Mocks are reset before each test**, with a comment explaining why: to avoid tests that fail depending on order.
- The `test-writer` agent in this plugin is there to write them.

### Format and tools

- **Prettier:** no semicolons, single quotes, 2 spaces, 100 characters per line and `es5` trailing commas ([templates/.prettierrc](templates/.prettierrc)).
- **ESLint** with the rules a machine can check ([templates/eslint.config.js](templates/eslint.config.js)): no `else`, ternaries, `switch`, `function`, `export default` or `try`; one level of blocks; 3 parameters; 20 lines; names.
- **Ruff** in Python, with 100 characters, names and 3 parameters at most ([templates/ruff.toml](templates/ruff.toml)). What Ruff cannot check (no `else`/`elif`/ternary/`match`, `except` only in `attempt.py`, 20 lines, one level of blocks and a reason for every exception) is watched by a test using `ast` ([templates/test_style_rules.py](templates/test_style_rules.py)).
- **In CI:** lint, format and the style test, so that what can be checked is checked by the machine and not by memory.
- **At the end of each turn**, if enabled, the plugin's stop hook runs the project's formatter and linter on the changed files (or a light checker if the project has none) and returns whatever fails.
- **Lessons-learned log** (`LESSONS_LEARNED.md` or the project's devlog): every real error that was fixed, in the format **Error / Fix / Concept learned**.

## Principles behind the style

| Principle | What it looks like in code |
|---|---|
| **Ousterhout: deep modules** | `ordersService.list()` has a small interface and hides `fetch`, headers and errors |
| **McConnell: do not add accidental complexity** | Clear names, short functions, no nesting |
| **Shvets (refactoring.guru): Strategy, guards, Extract Function** | Configuration tables, early `return`, `assertX` functions |
| **SRP** | View, hook, service and model separated |
| **OCP** | A new case is one more entry in the table, without touching the components |
| **DRY** | A single source of truth: one API client, one table per concept |
| **KISS / YAGNI** | No layers or libraries "just in case" |
| **LOD** | Destructure (`const { buttonText } = configOfStatus(status)`) instead of `a.b.c.d` |

## Mistakes not to copy

Seen in real projects; if they show up, they get fixed:

- **Huge components with several modals inside:** one file per modal, each with its own hook.
- **The token and the authentication headers repeated in every service:** a single API client in `core/`.
- **Utilities defined twice** (`cx` in two folders): only the one in `core/`.
- **A feature that imports from another:** what is shared moves up to `core/`.
- **Generic names** (`res`, `data`, `e`, `err`): `response`, `profile`, `event`, `error`.
- **`export default` and named exports mixed:** always `export const`.
- **Hooks with logic and no test:** one test per hook with logic.
- **Effects inside `setX((previous) => …)`** (drawing on a map, requesting from the API, moving the camera): that function only computes the new value, because React may run it twice and then requests and drawings get repeated. Effects go in a `useEffect` that watches that state.

## When refactoring: behavior does not change

Splitting a boolean parameter into two functions, removing a ternary or turning a chain of `if`s into a table changes the shape of the code and can change what it does without anyone noticing. Before accepting it, check that these are kept:

- **the priorities:** if one case used to win over another (an `if` before its `elif`), it still wins; when splitting into two functions, someone still has to decide which one applies;
- **the default values:** what happened with a key missing from the table, with `null` or `None`, with an empty list or with a zero;
- **mutually exclusive cases:** what used to be one or the other must not become both added together;
- **the order of operations** (applying VAT before or after a surcharge) and **the public API:** whoever called the old function still has a way to get the same result.

**If no test covers that behavior, the test is written first (green with the old code) and then the refactor is done.** Any behavior change that remains, even if the rules ask for it, is stated in the reply.

## When you finish writing code

Review the limits (20 lines, 3 parameters, one level of blocks, no `else`, ternaries, `switch`, `match` or `catch` outside `attempt`), run lint and tests, and ask the `conventions-reviewer` agent to review the diff (the rules and the new exceptions) and, if there is doubt about general quality, the `craft-reviewer`.
