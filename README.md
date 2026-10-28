# fernando-stack

La forma de escribir y refactorizar código de Fernando del Río, empaquetada como **plugin de Claude Code** para que todos sus proyectos se escriban igual y él pueda leerlos y cambiarlos sin IA.

Sale de la norma que se aplicó y se probó en `primer-equipo-ai` (octubre de 2026): frontend, backend y scripts reescritos con ella, y vigilada por la máquina en la CI.

## Qué trae

| Pieza | Para qué | Cuándo se usa |
|---|---|---|
| **Skill `estilo-codigo`** | La norma: 20 reglas, la lectura humana primero y cómo se escribe cada nombre; un antes y después por regla en TypeScript y Python en `ejemplos.md` | Sola, al escribir, cambiar o revisar código; o con `/fernando-stack:estilo-codigo` |
| **Skill `refactorizar`** | Guía de refactoring.guru (smells, técnicas, lista por archivo) y el método paso a paso sin romper nada | Al pedir refactorizar o limpiar código |
| **Skill `limpiar-rastro-ia`** | Quita comentarios de relleno, emojis, banners, firmas y docstrings vacíos sin tocar el código, con un script que los busca (una carpeta o archivos sueltos) | Al pedir limpiar comentarios o «quitar lo que huele a IA»; antes de enseñar código a un cliente |
| **Skill `estructura-proyecto`** | Carpetas del frontend y del backend, organización de `docs/` (plan, bitácora, índice), ramas y commits | Al empezar un proyecto o decidir dónde va algo |
| **Skill `iniciar-proyecto`** | Copia las plantillas según el stack, instala lint y formato y crea `AGENTS.md` y `CLAUDE.md` mínimos | Solo a mano: `/fernando-stack:iniciar-proyecto` |
| **Agente `conventions-reviewer`** | Revisa contra la norma solo los cambios de la sesión (diff y archivos nuevos): lista corta de infracciones con `archivo:línea` y las excepciones nuevas para aprobar. No edita | Después de escribir o cambiar código |
| **Hook de cierre** (`hooks/`, **desactivado**) | Al terminar un turno con cambios de código, pasa el formateador y el linter del proyecto a los archivos cambiados (o un comprobador ligero si no los hay) y devuelve lo que falle para que se corrija | Ver «Activar el hook de cierre» |
| **Agente `craft-reviewer`** | Revisa la calidad general (Ousterhout, McConnell, SOLID, DRY/KISS/YAGNI…) | Para saber si algo está bien escrito |
| **Agente `backend-reviewer`** | Revisa la seguridad (OWASP) y el escalado del backend | Después de tocar endpoints, autenticación o consultas |
| **Agente `test-writer`** | Escribe y ejecuta pruebas con las reglas de Fernando | Después de una funcionalidad o un arreglo |

Plantillas para copiar en un proyecto nuevo, en [skills/estilo-codigo/plantillas/](skills/estilo-codigo/plantillas/):

| Archivo | Dónde va |
|---|---|
| `intentar.ts` | `frontend/src/modules/core/lib/`: el único `try/catch` del frontend |
| `intentar.py` | `backend/`: el único `try/except` del backend |
| `eslint.config.js` y `.prettierrc` | `frontend/` |
| `ruff.toml` | Raíz del proyecto |
| `test_norma_estilo.py` | `tests/`: lo que Ruff no sabe comprobar (sin `else`/`elif`/ternario/`match`, `except` solo en `intentar.py`, 20 líneas, 3 parámetros, un nivel de bloques y excepciones con su porqué) |

## Activar el hook de cierre

Viene desactivado: el archivo se llama `hooks/hooks.desactivado.json` y Claude Code solo carga `hooks/hooks.json`.

1. Renombra `hooks/hooks.desactivado.json` a `hooks/hooks.json`.
2. Sube la versión en `.claude-plugin/plugin.json`, haz commit y push, y actualiza el plugin en cada ordenador (sección «Actualizar»).
3. Reinicia Claude Code. Con `/hooks` se ve el `Stop` del plugin.

Qué hace en cada turno que termina con archivos de código cambiados (según `git status`):

- **Solo mira las líneas cambiadas** respecto a `HEAD` (`git diff -U0`); un archivo nuevo cuenta entero. El código antiguo que Claude no ha tocado no cuenta, aunque esté en el mismo archivo.
- **Repo con la norma** (tiene `tests/test_norma_estilo.py`, o un `ruff.toml` o `eslint.config.js` que nombra `fernando-stack` o `ESTILO_CODIGO_FERNANDO`):
  - **TypeScript/JavaScript:** si la carpeta tiene `eslint.config.*` y `node_modules/eslint`, Prettier (`--write`) y ESLint a esos archivos; si no, el comprobador ligero (`hooks/comprobador-ligero.mjs`);
  - **Python:** con `ruff.toml` (o `[tool.ruff]` en `pyproject.toml`) y Ruff en `.venv`, `ruff format`, `ruff check` y `tests/test_norma_estilo.py` si existe; si no, el comprobador ligero;
  - lo que falle **vuelve a Claude** para que lo corrija, como mucho **2 veces** (`MAX_INTENTOS`). Al tercer cierre en rojo, para y te enseña lo que queda.
- **Repo sin la norma:** comprobador ligero, **sin formatear nada** y **sin bloquear**: te avisa a ti y Claude termina.
- **Siempre:** que cada excepción tenga su porqué y no toque una regla sin excepción (`hooks/excepciones.mjs`), y los rastros de IA en los comentarios (`buscar_rastro_ia.py`).
- No repite la revisión si los archivos no han cambiado desde la última (en verde, avisada o abandonada).
- **Bucles:** el tope de Claude Code (8 bloqueos seguidos) se reinicia cada vez que Claude usa una herramienta, así que no para un hook que hace corregir código. Por eso el hook lleva su propio límite por sesión.
- **Tiempo medido** (Windows, 28/10/2026): en un repo de 7 091 archivos sin la norma, de 0,5 a 0,8 s con hasta 5 archivos tocados y 2,2 s con 50; en `primer-equipo-ai` con ESLint, Ruff y la prueba de la norma, unos 3 s.
- Si el hook falla por su cuenta (un error de Node), sale con código 1, Claude Code lo trata como un aviso que no bloquea y Claude termina igual.

**Probarlo en un solo proyecto** antes de activarlo en todos: no renombres `hooks.desactivado.json`; añade el hook al `.claude/settings.local.json` de ese proyecto, apuntando a tu copia del plugin:

```json
{
  "hooks": {
    "Stop": [
      { "hooks": [{ "type": "command", "command": "node \"C:/dev/fernando-stack/hooks/comprobar-cierre.mjs\"", "timeout": 120 }] }
    ]
  }
}
```

Para desactivarlo: renombra `hooks/hooks.json` otra vez a `hooks.desactivado.json` y actualiza, o apaga todos los hooks con `"disableAllHooks": true` en `~/.claude/settings.json`.

Si un proyecto tiene además su propio hook de cierre en `.claude/settings.json`, se ejecutan los dos (Claude Code suma los hooks de todas las fuentes): mejor quedarse con uno.

## Instalar

El repositorio es privado: el ordenador tiene que poder clonarlo con Git (la sesión de GitHub en Git Credential Manager basta).

Desde Claude Code:

```text
/plugin marketplace add fernando-delrio/fernando-stack
/plugin install fernando-stack@fernando-stack
```

O desde la terminal:

```bash
claude plugin marketplace add fernando-delrio/fernando-stack
claude plugin install fernando-stack@fernando-stack
```

Reinicia Claude Code. Con `/plugin` se ve instalado; las skills aparecen como `fernando-stack:estilo-codigo`, etc.

**Si ya tenías los agentes en `~/.claude/agents/`** (`craft-reviewer`, `conventions-reviewer`, `backend-reviewer`, `test-writer`), bórralos de ahí cuando el plugin esté instalado, para que no haya dos versiones distintas.

## Actualizar

Después de cambiar algo aquí y subirlo:

1. Sube `version` en [.claude-plugin/plugin.json](.claude-plugin/plugin.json) (por ejemplo `0.3.0` → `0.4.0`).
2. En cada ordenador:
   ```bash
   claude plugin marketplace update fernando-stack
   claude plugin update fernando-stack@fernando-stack
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
- **Estilo de código obligatorio:** la norma de Fernando (plugin `fernando-stack`, skill `estilo-codigo`). Al refactorizar, skill `refactorizar`; carpetas y documentación, skill `estructura-proyecto`.
```

Si el proyecto tiene su propia copia de la norma (como `primer-equipo-ai`), manda la del proyecto y las dos deben decir lo mismo.

## Estructura del repositorio

```text
.claude-plugin/
├── plugin.json         nombre, versión y descripción del plugin
└── marketplace.json    permite instalarlo con /plugin marketplace add
skills/
├── estilo-codigo/      SKILL.md + ejemplos.md + plantillas/
├── refactorizar/       SKILL.md
├── limpiar-rastro-ia/  SKILL.md + buscar_rastro_ia.py
├── estructura-proyecto/SKILL.md
└── iniciar-proyecto/   SKILL.md
agents/                 los cuatro agentes revisores
hooks/                  hook de cierre (desactivado): comprobar-cierre.mjs y sus módulos (git, herramientas,
                        comprobador ligero, excepciones, ejecutar e intentar)
```

Para cambiar una regla, edita la skill correspondiente. Si la regla también la vigila la máquina, actualiza su plantilla y súbele la versión al plugin.
