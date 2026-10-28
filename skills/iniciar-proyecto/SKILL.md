---
name: iniciar-proyecto
description: Prepara un proyecto nuevo de Fernando con su norma de estilo ya vigilada por la máquina. Copia las plantillas de ESLint, Prettier, Ruff, la prueba de la norma e intentar() según el stack, instala las dependencias de lint y formato, y crea un AGENTS.md y un CLAUDE.md mínimos con solo lo específico del proyecto. Se lanza a mano con /fernando-stack:iniciar-proyecto al empezar un repositorio.
disable-model-invocation: true
argument-hint: "[frontend | backend | los dos]"
---

# Iniciar un proyecto con la norma de Fernando

Fernando empieza un proyecto nuevo. El objetivo: que desde el primer commit la norma la vigilen el linter, el formateador y la prueba de la norma, y que las instrucciones del proyecto solo digan lo que es de este proyecto. Lo que vale para todos ya está en `~/.claude/CLAUDE.md` y en la skill `estilo-codigo`, y no se repite. Stack pedido: $ARGUMENTS

## Antes de tocar nada

1. **Mira qué hay** (`git status`, `ls`, `package.json`, `pyproject.toml`). Si ya existe un archivo que vas a crear, no lo sobrescribas: enséñale a Fernando la diferencia y pregúntale.
2. **Decide el stack:** frontend (React + TypeScript + Vite), backend (Python + FastAPI) o los dos. Si $ARGUMENTS no lo dice y no se deduce de los archivos, pregúntalo.
3. **Carpetas:** las de la skill `estructura-proyecto` (`frontend/src/modules/…`, `backend/routes|services|models|migrations`, `tests/`, `docs/`). Créalas solo si están vacías o no existen.

## Frontend

Las plantillas están en la carpeta `plantillas/` de la skill `estilo-codigo` de este plugin.

1. Copia `eslint.config.js` y `.prettierrc` en `frontend/`, e `intentar.ts` en `frontend/src/modules/core/lib/`.
2. Instala las dependencias de desarrollo (versiones actuales, sin fijar a mano):
   ```bash
   npm --prefix frontend install -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-config-prettier globals prettier
   ```
3. Añade a `frontend/package.json` los scripts:
   ```json
   "lint": "eslint .",
   "format": "prettier --write src",
   "format:check": "prettier --check src"
   ```
4. Comprueba que funcionan: `npm --prefix frontend run lint` y `npm --prefix frontend run format:check` sobre lo que haya.

## Backend

1. Copia `ruff.toml` en la raíz, `intentar.py` en `backend/` y `test_norma_estilo.py` en `tests/`. Ajusta en `test_norma_estilo.py` las rutas de `ARCHIVOS_REVISADOS` y `UNICO_SITIO_CON_EXCEPT` si las carpetas no son `backend/` y `scripts/`.
2. Añade `ruff` y `pytest` a las dependencias de desarrollo (`requirements-dev.txt` o `pyproject.toml`, lo que use el proyecto) e instálalas en `.venv`.
3. Comprueba: `.venv/Scripts/python.exe -m ruff check .` (en Linux o macOS, `.venv/bin/python`) y `python -m pytest tests/test_norma_estilo.py -q`.

## Instrucciones del proyecto

Crea `AGENTS.md` en la raíz (lo leen Claude Code, Codex y otros agentes) con **solo** esto, rellenado con los datos reales:

```markdown
# <Nombre del proyecto>

<Una línea: qué es y para quién.>

## Antes de dar algo por hecho
- <comando exacto de las pruebas>
- <comando exacto del lint y del formato, frontend y backend>

## Normas de este proyecto
- <solo lo que no se deduce del código y no está en la norma global: reglas de negocio, datos que no se tocan, servicios externos>
```

Y `CLAUDE.md` con una sola línea, para que Claude Code lea el mismo archivo:

```markdown
@AGENTS.md
```

No copies en ninguno de los dos la norma de estilo, la estructura de carpetas ni la arquitectura: la norma ya está en la skill y Claude lee el código. Si Fernando usa el relevo de guardrails (`/arranque` y `/cierre`), créale también un `MEMORY.md` vacío con su plantilla.

## Seguridad básica

Crea `.claude/settings.json` (o añade a uno existente) para que el agente no lea los secretos:

```json
{
  "permissions": {
    "deny": ["Read(.env)", "Read(.env.*)", "Read(!.env.example)"]
  }
}
```

Y comprueba que `.gitignore` excluye `.env`, `.venv/`, `node_modules/` y `dist/`.

## Al terminar

- **Nunca** `git add`, `git commit` ni `git push`: Git es de Fernando.
- Resume en pocas líneas qué archivos has creado, qué comandos de comprobación pasaron y cuáles no.
- Dale los comandos para el primer commit, por ejemplo `git add -A` y `git commit -m "chore: norma de estilo, lint y formato desde el inicio"`.
