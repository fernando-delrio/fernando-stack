---
name: estilo-codigo
description: Norma de estilo obligatoria de Fernando para escribir o revisar código en sus proyectos (TypeScript/React y Python). Úsala siempre que escribas, cambies o revises código en un proyecto de Fernando, aunque no la nombre. Arrow functions, const, nombres con sentido en castellano, sin else, sin switch/match, sin catch repartidos, tablas en lugar de cadenas de if, capas separadas y funciones cortas.
---

# Norma de estilo de Fernando

**Para qué sirve:** que todo el código se escriba como lo escribe Fernando, para que pueda leerlo, entenderlo y cambiarlo él solo aunque un día no haya IA. **Es obligatoria** para el código nuevo y para el que se refactorice, lo escriba Fernando, Claude o Codex.

Si el proyecto tiene su propia copia de la norma (por ejemplo `docs/…/ESTILO_CODIGO_FERNANDO.md`), las dos dicen lo mismo; si alguna vez chocan, manda la del proyecto y conviene avisar a Fernando para igualarlas.

## Las 17 reglas

1. **`const` siempre.** Nada de `var`; `let` solo en dos casos: el contador de un bucle con índice cuando no hay forma declarativa, y la bandera de cancelación dentro de un `useEffect`.
2. **Arrow functions con nombre**, nunca `function`: `const enviarFormulario = async (event) => { … }`.
3. **El nombre explica lo que hace.** Verbo + objeto en las funciones (`cargarPedidos`, `assertRespuestaCorrecta`) e `is`/`has` en los booleanos (`isEnviando`, `hasPedidosNuevos`). Nunca `T`, `x`, `fn`, `data` o `res`, tampoco en los genéricos de TypeScript (`<Respuesta>`, no `<T>`). La prueba: ¿se entiende dentro de dos meses sin leer el cuerpo?
4. **Sin `else`.** Se sale pronto con cláusulas de guarda (`if (…) return`) o se extrae una función con nombre.
5. **Pocos `if`.** Lo que cambia según un valor va en una **tabla** (patrón Strategy), no en una cadena de `if`.
6. **En JSX, guardas con nombre encadenadas con `||`**, sin `if` ni ternarios anidados.
7. **Cada capa hace una cosa:** el componente pinta, el hook orquesta, el servicio habla con la API y la librería transforma datos.
8. **Organización por funcionalidad** (`modules/<feature>/components|hooks|services|lib`); lo compartido va en `core/`. El detalle está en la skill `estructura-proyecto`.
9. **Los datos de la API se sanean en la frontera**, con valores por defecto, antes de llegar a la vista.
10. **Declarativo antes que imperativo:** `map`/`filter`/`reduce` en lugar de bucles `for`.
11. **Comentarios en castellano que explican el porqué**, no el qué. Si un bloque necesita un comentario para entender qué hace, se extrae a una función con nombre.
12. **Se prueba el hook, no el componente**, con la estructura Preparar-Actuar-Comprobar. Los errores corregidos se apuntan en un registro de errores aprendidos.
13. **Siempre `export const`**, también en los componentes de página. Nada de `export default` (salvo donde una herramienta lo exige, como `eslint.config.js` o `vite.config.ts`).
14. **Idioma:** lo técnico de React y JavaScript en inglés (`useState`, `useEffect`, `props`, `children` y los prefijos `use`, `is`, `has`, `handle`, `on`). Todo lo demás, en castellano: `pedido`, `empleado`, `marcarHecho`, `usePanelTienda`, `isEnviando`, `handleCogerPedido`.
15. **En Python, las mismas reglas que encajan:** guardas, ningún `else` ni `elif`, diccionarios en lugar de cadenas de `if`, nombres con sentido, funciones pequeñas y una responsabilidad por función. Se declara con `def`, porque en Python no hay arrow functions; `lambda` solo para expresiones de una línea.
16. **Nunca `switch` (JavaScript) ni `match` (Python).** Lo que cambia según un valor va en una tabla: un objeto o un diccionario de valores o de funciones.
17. **Nunca `catch` ni `except` repartidos por el código.** Los errores se recogen en **un único sitio por capa**:
    - **Frontend:** `core/lib/intentar.ts` convierte cualquier error en un resultado `{ valor, error }`, y el resto del código decide con guardas (`if (error) return …`). Ningún otro archivo usa `try`, `catch` ni `.catch()`.
    - **Backend:** `intentar.py` hace lo mismo con un `Resultado(valor, error)` y obliga a decir qué errores se esperan. Los demás llegan a los manejadores de excepciones de la app (en FastAPI, los de `main.py`), que traducen los errores con nombre a respuestas HTTP. `try/finally` para cerrar recursos sí se admite, porque no recoge errores.

    Implementaciones de referencia: [plantillas/intentar.ts](plantillas/intentar.ts) y [plantillas/intentar.py](plantillas/intentar.py).

**Límites que vigila la máquina** (vienen de la guía de refactorización): funciones de **20 líneas** como máximo (40 en los componentes de React, porque cuentan el JSX), **3 parámetros** como máximo (con más, un objeto con nombre), **2 niveles** de anidación, ningún ternario anidado y nombres de 2 letras o más.

## Cómo se ve cada regla

### Funciones y nombres

```ts
const assertDentroDelProveedor = (contexto: ContextoSesion | null) => {
  if (!contexto) throw new Error('useSesion debe usarse dentro de <ProveedorSesion>')
}

export const useSesion = () => {
  const contexto = useContext(ContextoDeSesion)
  assertDentroDelProveedor(contexto)
  return contexto
}
```

Las condiciones se nombran en vez de dejarlas en bruto:

```ts
const isSesionCaducada = response.status === 401
const isYaEnElAcceso = window.location.pathname === RUTA_DE_ACCESO
if (isSesionCaducada && !isYaEnElAcceso) irAlAcceso()
```

### Menos `if`, ningún `else` (cinco técnicas, en orden de preferencia)

**a) Guarda: salir pronto.**
```ts
const pedir = async (ruta: string) => {
  const response = await fetch(ruta)
  if (response.status === 204) return null
  assertRespuestaCorrecta(response)
  return response.json()
}
```

**b) La comprobación, en una función con nombre** (`assertX`, `isX`). El `if` queda dentro de una función de una línea y el código principal se lee de corrido.

**c) Validaciones como lista de guardas que devuelven el primer error:**
```ts
const errorDeValidacion = (formulario: Formulario) => {
  if (isVacio(formulario.nombre)) return 'El nombre es obligatorio'
  if (formulario.pin.length !== 4) return 'El PIN tiene 4 cifras'
  return null
}
```

**d) Tabla en lugar de `if`/`switch` (Strategy):**
```ts
// Todo lo que depende del estado está aquí; un estado nuevo es una línea más.
export const CONFIG_POR_ESTADO = {
  nuevo: { etiqueta: 'Nuevo', siguiente: 'en_proceso', textoBoton: 'Coger' },
  en_proceso: { etiqueta: 'En proceso', siguiente: 'hecho', textoBoton: 'Marcar hecho' },
} as const
export const configDelEstado = (estado: Estado) => CONFIG_POR_ESTADO[estado] ?? CONFIG_POR_ESTADO.nuevo
```

En Python, igual con un diccionario:
```python
ACCIONES = {
    "coger": coger_pedido,
    "liberar": liberar_pedido,
    "hecho": marcar_hecho,
}


def aplicar_accion(nombre, pedido):
    accion = ACCIONES.get(nombre)
    if accion is None:
        raise AccionDesconocida(nombre)
    return accion(pedido)
```

**e) En JSX, guardas con nombre encadenadas con `||`.** Cada guarda devuelve el JSX que toca o `false`, y gana la primera que devuelve algo:
```tsx
const cargando = ({ isCargando }: Sesion) => isCargando && <Aviso texto="Comprobando sesión..." />
const sinSesion = ({ usuario }: Sesion) => !usuario && <Navigate to="/" replace />

export const RutaProtegida = () => {
  const sesion = useSesion()
  return cargando(sesion) || sinSesion(sesion) || <Outlet />
}
```

Para hacer algo solo si se cumple una condición: `usuario?.rol && navigate('/tienda')`.

### Errores en un único sitio

```ts
// Hook (orquesta): pide, decide con una guarda y lo convierte en estado.
const cargarPedidos = async () => {
  const { valor, error } = await intentar(servicioPedidos.listar())
  if (error) return setMensaje(error.message)
  setPedidos(valor)
}
```

```python
resultado = intentar(lambda: leer_token(token), ValueError)
if resultado.error:
    return None
```

El servicio **lanza** (`throw new Error(...)` / `raise ErrorConNombre(...)`); quien orquesta lo **recoge con `intentar`**; la vista nunca ve una excepción.

### Datos de la API: se sanean al entrar

```ts
const listaSegura = <Elemento>(valor: unknown): Elemento[] => (Array.isArray(valor) ? valor : [])

const sanearPedido = (crudo: PedidoCrudo, posicion: number): Pedido => ({
  id: crudo?.id ?? `pedido-${posicion}`,
  cliente: crudo?.cliente || 'Sin nombre',
  isUrgente: Boolean(crudo?.urgente),
})

export const modeloDelPanel = (crudo: RespuestaPanel) => ({
  pedidos: listaSegura<PedidoCrudo>(crudo?.pedidos).map(sanearPedido),
})
```

La vista nunca recibe un `null` inesperado. Cada campo tiene su valor por defecto en un solo sitio.

### Comentarios

En castellano y explicando **el porqué**:
```ts
// Aquí y no en cada servicio: hay 17 servicios con su propio fetch y así un 401
// se trata igual en todos sin tocarlos uno a uno.
```
En los archivos largos se usan cabeceras de sección: `// ── Peticiones ──`, `# ── Copia ──`.

### Pruebas

- **El hook, con `renderHook`**, no el componente: si el hook funciona, el componente pinta bien.
- **Vitest + Testing Library + MSW** en el frontend, con los mocks apuntando a la misma URL base que el código. **pytest** en el backend, contra una base de pruebas aislada (nunca la de desarrollo).
- **Caso correcto y caso de error** en cada hook o endpoint.
- **Los mocks se reinician antes de cada prueba**, con un comentario que explica el porqué: evitar pruebas que fallen según el orden.
- Para escribirlas está el agente `test-writer` de este plugin.

### Formato y herramientas

- **Prettier:** sin punto y coma, comillas simples, 2 espacios, 100 caracteres por línea y coma final `es5` ([plantillas/.prettierrc](plantillas/.prettierrc)).
- **ESLint** con las reglas de la norma que la máquina sabe comprobar ([plantillas/eslint.config.js](plantillas/eslint.config.js)).
- **Ruff** en Python, con 100 caracteres y 3 parámetros como máximo ([plantillas/ruff.toml](plantillas/ruff.toml)). Lo que Ruff no sabe comprobar (ningún `else`/`elif`/`match`, `except` solo en `intentar.py`, 20 líneas por función) lo vigila una prueba con `ast` ([plantillas/test_norma_estilo.py](plantillas/test_norma_estilo.py)).
- **En la CI:** lint, formato y la prueba de la norma, para que lo que se puede comprobar lo compruebe la máquina y no la memoria.
- **Registro de errores aprendidos** (`ERRORES_APRENDIDOS.md` o la bitácora del proyecto): cada error real corregido, con el formato **❌ Error / ✅ Corrección / 🎓 Concepto aprendido**.

## Principios detrás del estilo (las lecturas de Fernando)

| Principio | Cómo se ve en el código |
|---|---|
| **Ousterhout: módulos profundos** | `servicioPedidos.listar()` tiene una interfaz pequeña y esconde `fetch`, cabeceras y errores |
| **McConnell: no añadir complejidad accidental** | Nombres claros, funciones cortas, nada de anidar |
| **Shvets (refactoring.guru): Strategy, guardas, Extract Function** | Tablas de configuración, `return` temprano, funciones `assertX` |
| **SRP** | Vista, hook, servicio y modelo separados |
| **OCP** | Un caso nuevo es una entrada más en la tabla, sin tocar los componentes |
| **DRY** | Una sola fuente de verdad: un único cliente de API, una única tabla por concepto |
| **KISS / YAGNI** | Sin capas ni librerías «por si acaso» |
| **LOD** | Desestructurar (`const { textoBoton } = configDelEstado(estado)`) en lugar de `a.b.c.d` |

## Fallos que no hay que copiar

Vistos en proyectos anteriores de Fernando; si aparecen, se corrigen:

- **Componentes enormes con varios modales dentro:** un archivo por modal, cada uno con su hook.
- **El token y las cabeceras de autenticación repetidos en cada servicio:** un único cliente de API en `core/`.
- **Utilidades definidas dos veces** (`cx` en dos carpetas): solo la de `core/`.
- **Una funcionalidad que importa de otra:** lo compartido sube a `core/`.
- **Nombres genéricos** (`res`, `data`, `e`, `err`): `response`, `perfil`, `event`, `error`.
- **`export default` y exportaciones con nombre mezclados:** siempre `export const`.
- **Hooks con lógica sin prueba:** una prueba por hook con lógica.

## Al terminar de escribir código

Repasar los límites (20 líneas, 3 parámetros, sin `else`, `switch`, `match` ni `catch` fuera de `intentar`), pasar el lint y las pruebas, y si hay duda pedir revisión a los agentes `conventions-reviewer` (la norma) y `craft-reviewer` (calidad general).
