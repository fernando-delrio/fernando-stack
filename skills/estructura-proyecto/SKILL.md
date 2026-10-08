---
name: estructura-proyecto
description: Estructura de carpetas, documentación y forma de trabajar de Fernando en sus proyectos (frontend React por módulos, backend Python por capas, docs con plan y bitácora, ramas y commits). Úsala al empezar un proyecto nuevo, al crear archivos o carpetas, al decidir dónde va algo, al escribir documentación o al preparar ramas y commits en un proyecto de Fernando.
---

# Estructura de los proyectos de Fernando

## Frontend (React + TypeScript + Vite)

```text
frontend/src/
├── routes.tsx                 todas las rutas en un único sitio, como tabla
├── main.tsx                   solo monta la app
├── assets/                    estilos
└── modules/
    ├── core/                  lo compartido entre funcionalidades
    │   ├── components/        botones, avisos, diseño común
    │   ├── hooks/
    │   ├── services/          el único cliente de API (cabeceras, sesión, errores)
    │   └── lib/               utilidades e intentar.ts (único try/catch)
    └── <funcionalidad>/       auth, pedidos, tienda… (nombre en castellano)
        ├── components/        vista: solo pinta, recibe todo del hook
        ├── hooks/             orquestación: estado, efectos, intentar() y mensajes
        ├── services/          API: fetch, comprueba la respuesta y lanza Error si falla
        ├── lib/               modelo: transforma y sanea datos; tablas de configuración
        └── types.ts           tipos de la funcionalidad
```

- **Ningún componente llama a `fetch`.** Ese recorrido es siempre vista → hook → servicio.
- **Una funcionalidad no importa de otra.** Lo que comparten sube a `core/`.
- **Un archivo por componente.** Si un componente tiene modales dentro, cada modal va en su archivo con su hook.
- **Las pruebas van junto al hook** (`useAlgo.test.ts`). La preparación común de las pruebas (servidor MSW, envoltorio con el router) va en `src/tests/`.
- **Archivos estáticos** (logo, iconos) en `frontend/public/`.

## Backend (Python, FastAPI)

```text
backend/
├── main.py           compone la app: rutas, middleware y manejadores de excepciones (errores con nombre → HTTP)
├── intentar.py       único sitio que recoge errores
├── dependencies.py   lo que comparten las rutas (sesión, base de datos)
├── routes/           una carpeta o archivo por funcionalidad: solo reciben, llaman al servicio y responden
├── services/         la lógica y el acceso a datos; las consultas SQL como constantes con nombre
├── models/           modelos Pydantic: validan en la frontera
└── migrations/       001_xxx.sql, 002_xxx.sql… una migración nueva por cambio; nunca editar una aplicada
scripts/              tareas sueltas (pruebas, copias, arranque); misma norma que el backend
tests/                pytest contra una base aislada, más test_norma_estilo.py
```

- **Una ruta no valida, consulta y formatea a la vez:** la validación va en el modelo y la lógica en el servicio.
- **Una sola réplica** mientras haya estado local (colas en disco, límites en memoria). Si se escala, eso cambia primero.

## Raíz del repositorio

```text
README.md            qué es, cómo se arranca y enlace al índice de docs
CLAUDE.md            normas del proyecto para Claude: plan, bitácora, pruebas y estilo
package.json         `npm run dev` arranca todo el entorno de desarrollo con concurrently
.env.example         todas las variables, sin valores secretos
ruff.toml            norma para Python
.github/workflows/   CI: pruebas, lint, formato, prueba de la norma y construcción
```

- **Un solo entorno de desarrollo y un solo comando:** `npm run dev` levanta backend, panel y lo que haga falta (túnel, etc.). Si una pieza se cae, se paran todas (`--kill-others`): nada queda en marcha colgado de otra terminal.
- **Plantillas de herramientas** (ESLint, Prettier, Ruff, prueba de la norma e `intentar`): en la skill `estilo-codigo`, carpeta `plantillas/`.

## Documentación (`docs/`)

Ordenada por **para qué sirve**, con números que marcan el orden de lectura:

```text
docs/
├── README.md          índice: organigrama, tabla «si quieres…, mira…» y dónde va cada documento nuevo
├── 1-dia-a-dia/       arrancar el proyecto; relevo para seguir desde otro ordenador
├── 2-plan/            PLAN.md, BITACORA.md, plan de pruebas y criterios de aceptación
├── 3-empresa/         lo que depende de otros: preguntas, accesos, mensajes pendientes
├── 4-tecnico/         arquitectura y, si el proyecto la copia, la norma de estilo
├── 5-<integracion>/   cada servicio externo importante (por ejemplo 5-vapi/)
├── 6-produccion/      de desarrollo a producción, operación, copias
├── 7-futuro/          ideas para después
└── historico/         lo sustituido, con un aviso arriba y qué lo sustituye
```

- **`PLAN.md`** es el plan único. Arriba lleva «Cómo leer este plan» y el estado del día. **Cada cosa hecha o comprobada se marca en el momento** con `[x]` y la fecha (DD/MM/AAAA). Si algo solo está programado y no se ha probado de verdad, se dice en la línea. Lo descartado se tacha (`~~así~~`), con el motivo.
- **`BITACORA.md`** guarda las decisiones y su porqué, **de la más reciente a la más antigua**. Cada entrada empieza por `## AAAA-MM-DD — Título (quién)` y explica el problema, la decisión, el porqué y lo comprobado.
- **No se crean listas de pendientes por días:** lo pendiente vive en `PLAN.md`.
- **Un documento que deja de valer va a `historico/`,** no se borra.
- **Nunca en `docs/`:** secretos, contraseñas ni datos personales.
- **Todo en castellano**, escrito para que lo entienda alguien que no estuvo en la conversación.

## Forma de trabajar

- **Ramas por el trabajo, no por quién lo hace:** `feature/…`, `fix/…`, `docs/…` o `refactor/…`, con el nombre en castellano. Nunca `claude/` ni `codex/`.
- **Los commits y los push los hace Fernando.** Claude prepara los cambios y le da los comandos (`git add`, `git commit -m "…"`, `git push -u origin <rama>`) para que los ejecute él.
- **Pull request con la CI en verde** antes de fusionar en `main`.
- **Los mensajes de commit,** en castellano y con prefijo: `feat:`, `fix:`, `docs:`, `refactor:`, `ci:`, `test:`.
- **Antes de borrar o sobrescribir algo, se mira qué hay.**
