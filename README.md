# fernando-stack

La forma de escribir y refactorizar código de Fernando del Río, empaquetada como **plugin de Claude Code** para que todos sus proyectos se escriban igual y él pueda leerlos y cambiarlos sin IA.

Sale de la norma que se aplicó y se probó en `primer-equipo-ai` (octubre de 2026): frontend, backend y scripts reescritos con ella, y vigilada por la máquina en la CI.

## Qué trae

| Pieza | Para qué | Cuándo se usa |
|---|---|---|
| **Skill `estilo-codigo`** | La norma: 17 reglas con ejemplos en TypeScript/React y Python, principios y fallos que no hay que copiar | Sola, al escribir o revisar código; o con `/fernando-stack:estilo-codigo` |
| **Skill `refactorizar`** | Guía de refactoring.guru (smells, técnicas, lista por archivo) y el método paso a paso sin romper nada | Al pedir refactorizar o limpiar código |
| **Skill `limpiar-rastro-ia`** | Quita comentarios de relleno, emojis, banners, firmas y docstrings vacíos sin tocar el código, con un script que los busca | Al pedir limpiar comentarios o «quitar lo que huele a IA»; antes de enseñar código a un cliente |
| **Skill `estructura-proyecto`** | Carpetas del frontend y del backend, organización de `docs/` (plan, bitácora, índice), ramas y commits | Al empezar un proyecto o decidir dónde va algo |
| **Agente `conventions-reviewer`** | Revisa que el código cumpla la norma | Después de escribir o cambiar código |
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
| `test_norma_estilo.py` | `tests/`: lo que Ruff no sabe comprobar (sin `else`/`match`, `except` solo en `intentar.py`, 20 líneas, 3 parámetros) |

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

1. Sube `version` en [.claude-plugin/plugin.json](.claude-plugin/plugin.json) (`0.1.0` → `0.2.0`).
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
├── estilo-codigo/      SKILL.md + plantillas/
├── refactorizar/       SKILL.md
├── limpiar-rastro-ia/  SKILL.md + buscar_rastro_ia.py
└── estructura-proyecto/SKILL.md
agents/                 los cuatro agentes revisores
```

Para cambiar una regla, edita la skill correspondiente. Si la regla también la vigila la máquina, actualiza su plantilla y súbele la versión al plugin.
