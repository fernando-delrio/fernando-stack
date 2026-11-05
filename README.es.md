# readfirst

*Read in English: [README.md](README.md)*

**El código lo leen primero las personas.** readfirst es un plugin de [Claude Code](https://claude.com/claude-code) que empaqueta una forma de escribir y refactorizar código, para que todos los proyectos se escriban igual y una persona pueda leerlos y cambiarlos sin IA.

El estilo se ha aplicado y probado reescribiendo frontends, backends y scripts enteros con él, y una máquina lo vigila en la CI.

> Las skills, los agentes y el código del plugin están en inglés; este README es la versión en castellano.

## Qué trae

| Pieza | Para qué | Cuándo se usa |
|---|---|---|
| **Skill `code-style`** | Las reglas: 20 reglas, la lectura humana primero y cómo se escribe cada nombre; un antes y después por regla en TypeScript y Python en `examples.md` | Sola, al escribir, cambiar o revisar código; o con `/readfirst:code-style` |
| **Skill `refactor`** | La guía de refactoring.guru (smells, técnicas, lista por archivo) y el método paso a paso sin romper nada | Al pedir refactorizar o limpiar código |
| **Skill `clean-ai-traces`** | Quita comentarios de relleno, emojis, banners, firmas y docstrings vacíos sin tocar el código, con un script que los busca (una carpeta o archivos sueltos) | Al pedir limpiar comentarios o «quitar lo que huele a IA»; antes de enseñar código a un cliente |
| **Skill `project-structure`** | Carpetas del frontend y del backend, organización de `docs/` (plan, bitácora, índice), ramas y commits | Al empezar un proyecto o decidir dónde va algo |
| **Skill `init-project`** | Copia las plantillas según el stack, instala lint y formato y crea `AGENTS.md` y `CLAUDE.md` mínimos | Solo a mano: `/readfirst:init-project` |
| **Agente `conventions-reviewer`** | Revisa solo los cambios de la sesión (diff y archivos nuevos) contra las reglas: lista corta de infracciones con `archivo:línea` y las excepciones nuevas para que las apruebes. No edita | Después de escribir o cambiar código |
| **Hook de cierre** (`hooks/`, **desactivado**) | Al terminar un turno con cambios de código, pasa el formateador y el linter del proyecto a los archivos cambiados (o un comprobador ligero si no los hay) y devuelve lo que falle para que se corrija | Ver «Activar el hook de cierre» |
| **Agente `craft-reviewer`** | Revisa la calidad general (Ousterhout, McConnell, SOLID, DRY/KISS/YAGNI…) | Para saber si algo está bien escrito |
| **Agente `backend-reviewer`** | Revisa la seguridad (OWASP) y el escalado del backend | Después de tocar endpoints, autenticación o consultas |
| **Agente `test-writer`** | Escribe y ejecuta pruebas con las reglas | Después de una funcionalidad o un arreglo |

Plantillas para copiar en un proyecto nuevo, en [skills/code-style/templates/](skills/code-style/templates/):

| Archivo | Dónde va |
|---|---|
| `attempt.ts` | `frontend/src/modules/core/lib/`: el único `try/catch` del frontend |
| `attempt.py` | `backend/`: el único `try/except` del backend |
| `eslint.config.js` y `.prettierrc` | `frontend/` |
| `ruff.toml` | Raíz del proyecto |
| `test_style_rules.py` | `tests/`: lo que Ruff no sabe comprobar (sin `else`/`elif`/ternario/`match`, `except` solo en `attempt.py`, 20 líneas, 3 parámetros, un nivel de bloques y excepciones con su porqué) |

## La idea en diez líneas

- Sin `else`, sin ternarios, sin `switch`/`match`: guardas, funciones con nombre y tablas.
- Un nivel de bloques por función; 20 líneas y 3 parámetros como máximo.
- Los errores se recogen en un solo sitio (`attempt()`), nunca `try/catch` repartidos.
- Sin parámetros booleanos; un estado con nombre en lugar de varios booleanos.
- Arrow functions con nombre y `export const`; sin números ni textos mágicos.
- Los comentarios solo explican el porqué.
- Al refactorizar, el comportamiento no cambia, y sin prueba no se toca.
- Si una regla empeora claramente la lectura, se admite una excepción local, con su porqué en la misma línea.

## Activar el hook de cierre

Viene desactivado: el archivo se llama `hooks/hooks.disabled.json` y Claude Code solo carga `hooks/hooks.json`.

1. Renombra `hooks/hooks.disabled.json` a `hooks/hooks.json`.
2. Sube la versión en `.claude-plugin/plugin.json`, haz commit y push, y actualiza el plugin en cada ordenador (sección «Actualizar»).
3. Reinicia Claude Code. Con `/hooks` se ve el `Stop` del plugin.

Qué hace en cada turno que termina con archivos de código cambiados (según `git status`):

- **Solo mira las líneas cambiadas** respecto a `HEAD` (`git diff -U0`); un archivo nuevo cuenta entero. El código antiguo que Claude no ha tocado no cuenta, aunque esté en el mismo archivo.
- **Repo con las reglas** (tiene `tests/test_style_rules.py`, o un `ruff.toml` o `eslint.config.js` que menciona `readfirst`):
  - **TypeScript/JavaScript:** si la carpeta tiene `eslint.config.*` y `node_modules/eslint`, Prettier (`--write`) y ESLint a esos archivos; si no, el comprobador ligero (`hooks/light-checker.mjs`);
  - **Python:** con `ruff.toml` (o `[tool.ruff]` en `pyproject.toml`) y Ruff en `.venv`, `ruff format`, `ruff check` y `tests/test_style_rules.py` si existe; si no, el comprobador ligero;
  - lo que falle **vuelve a Claude** para que lo corrija, como mucho **2 veces** (`MAX_ATTEMPTS`). Al tercer cierre en rojo, para y te enseña lo que queda.
- **Repo sin las reglas:** comprobador ligero, **sin formatear nada** y **sin bloquear**: te avisa a ti y Claude termina.
- **Siempre:** que cada excepción tenga su porqué y no toque una regla sin excepción (`hooks/exceptions.mjs`), y los rastros de IA en los comentarios (`find_ai_traces.py`).
- No repite la revisión si los archivos no han cambiado desde la última (en verde, avisada o abandonada).
- **Bucles:** el tope de Claude Code (8 bloqueos seguidos) se reinicia cada vez que Claude usa una herramienta, así que no para un hook que hace corregir código. Por eso el hook lleva su propio límite por sesión.
- **Tiempo medido** (Windows): en un repo de 7 091 archivos sin las reglas, de 0,5 a 0,8 s con hasta 5 archivos tocados y 2,2 s con 50; en un proyecto con ESLint, Ruff y la prueba de estilo, unos 3 s.
- Si el hook falla por su cuenta (un error de Node), sale con código 1, Claude Code lo trata como un aviso que no bloquea y Claude termina igual.

**Probarlo en un solo proyecto** antes de activarlo en todos: no renombres `hooks.disabled.json`; añade el hook al `.claude/settings.local.json` de ese proyecto, apuntando a tu copia del plugin:

```json
{
  "hooks": {
    "Stop": [
      { "hooks": [{ "type": "command", "command": "node \"C:/dev/readfirst-code-style/hooks/check-on-stop.mjs\"", "timeout": 120 }] }
    ]
  }
}
```

Para desactivarlo: renombra `hooks/hooks.json` otra vez a `hooks.disabled.json` y actualiza, o apaga todos los hooks con `"disableAllHooks": true` en `~/.claude/settings.json`.

Si un proyecto tiene además su propio hook de cierre en `.claude/settings.json`, se ejecutan los dos (Claude Code suma los hooks de todas las fuentes): mejor quedarse con uno.

## Instalar

Desde Claude Code:

```text
/plugin marketplace add fernando-delrio/readfirst-code-style
/plugin install readfirst@readfirst
```

O desde la terminal:

```bash
claude plugin marketplace add fernando-delrio/readfirst-code-style
claude plugin install readfirst@readfirst
```

Reinicia Claude Code. Con `/plugin` se ve instalado; las skills aparecen como `readfirst:code-style`, etc.

**Si ya tenías los agentes en `~/.claude/agents/`** (`craft-reviewer`, `conventions-reviewer`, `backend-reviewer`, `test-writer`), bórralos de ahí cuando el plugin esté instalado, para que no haya dos versiones distintas.

## Actualizar

Después de cambiar algo aquí y subirlo:

1. Sube `version` en [.claude-plugin/plugin.json](.claude-plugin/plugin.json) (por ejemplo `1.0.0` → `1.1.0`).
2. En cada ordenador:
   ```bash
   claude plugin marketplace update readfirst
   claude plugin update readfirst@readfirst
   ```
   y reinicia Claude Code.

Antes de subir, valida:

```bash
claude plugin validate .
claude plugin validate skills
claude plugin validate agents
```

## Usarlo en un proyecto

El plugin funciona en todos los proyectos en cuanto está instalado. Para dejarlo escrito en cada repositorio, añade esta línea a su `CLAUDE.md`:

```markdown
- **Estilo de código obligatorio:** las reglas de readfirst (plugin `readfirst`, skill `code-style`). Al refactorizar, skill `refactor`; carpetas y documentación, skill `project-structure`.
```

Si el proyecto tiene su propia copia de las reglas, manda la del proyecto y las dos deben decir lo mismo.

## Estructura del repositorio

```text
.claude-plugin/
├── plugin.json         nombre, versión y descripción del plugin
└── marketplace.json    permite instalarlo con /plugin marketplace add
skills/
├── code-style/         SKILL.md + examples.md + templates/
├── refactor/           SKILL.md
├── clean-ai-traces/    SKILL.md + find_ai_traces.py
├── project-structure/  SKILL.md
└── init-project/       SKILL.md
agents/                 los cuatro agentes revisores
hooks/                  hook de cierre (desactivado): check-on-stop.mjs y sus módulos (git, tools,
                        comprobador ligero, excepciones, run y attempt)
```

Para cambiar una regla, edita la skill correspondiente. Si la regla también la vigila la máquina, actualiza su plantilla y súbele la versión al plugin.

## Licencia

[MIT](LICENSE). Úsalo, cópialo y cámbialo con libertad; solo hay que mantener el aviso de copyright.
