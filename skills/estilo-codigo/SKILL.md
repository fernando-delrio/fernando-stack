---
name: estilo-codigo
description: Norma de estilo obligatoria de Fernando para escribir, modificar o revisar código en cualquiera de sus proyectos (TypeScript/React y Python). Úsala siempre que escribas, cambies, refactorices o revises código, aunque no la nombre. Lectura humana primero; sin else ni ternarios; sin switch/match; un nivel de bloques; arrow functions y export const; errores solo en intentar(); funciones cortas; nombres con sentido en castellano; sin parámetros booleanos; comentarios solo del porqué; al refactorizar, el comportamiento no cambia y sin prueba no se toca.
---

# Norma de estilo de Fernando

**Para qué sirve:** que todo el código se escriba como lo escribe Fernando, para que pueda leerlo, entenderlo y cambiarlo él solo aunque un día no haya IA. **Es obligatoria** para el código nuevo y para el que se refactorice, lo escriba Fernando, Claude o Codex.

Si el proyecto tiene su propia copia de la norma (por ejemplo `docs/…/ESTILO_CODIGO_FERNANDO.md`), las dos dicen lo mismo; si alguna vez chocan, manda la del proyecto y conviene avisar a Fernando para igualarlas.

Cada regla tiene su **antes y después** en TypeScript y Python en [ejemplos.md](ejemplos.md).

## Lo primero: que lo lea bien una persona

Las reglas están para que el código se lea mejor, siempre dentro de estos principios. Si en un caso concreto cumplir una regla hace el código **claramente** menos legible, se admite una excepción local y explícita, con el porqué en la misma línea:

- TypeScript: `// eslint-disable-next-line max-depth -- <porqué>`
- Python: `# norma: permitir profundidad -- <porqué>` (vale `profundidad`, `lineas` o `parametros`) y, para Ruff, `# noqa: N802 -- <porqué>`

La excepción también se explica en la respuesta, y el agente `conventions-reviewer` lista todas las nuevas para que Fernando las apruebe.

**No admiten excepción**, porque siempre hay una alternativa legible en esta norma: `else`, ternarios, `switch`/`match`, `try/catch` fuera de `intentar`, `function` y `export default` (salvo en los archivos de configuración donde la herramienta lo exige, como `eslint.config.js` o `vite.config.ts`).

## Las 20 reglas

1. **`const` siempre.** Nada de `var`; `let` solo en dos casos: el contador de un bucle con índice cuando no hay forma declarativa, y la bandera de cancelación dentro de un `useEffect`. **Y lo de dentro tampoco se cambia:** `const` impide reasignar, pero no protege el contenido de una lista o un objeto. Para modificarlos se crea uno nuevo (`[...lista, nuevo]`, `{ ...objeto, campo: valor }`); nunca `push`, `splice` ni asignar a un campo. La excepción es `ref.current`, que existe para eso. El spread copia un solo nivel; para algo anidado, `structuredClone`.
2. **Arrow functions con nombre**, nunca `function`: `const enviarFormulario = async (event) => { … }`.
3. **El nombre explica lo que hace.** Verbo + objeto en las funciones (`cargarPedidos`, `calcularTotalFactura`); los booleanos, como en «Booleanos» más abajo. Nunca `T`, `x`, `fn`, `data`, `res` ni abreviaturas (`usr`, `tmp2`, `data1`), tampoco en los genéricos de TypeScript (`<Respuesta>`, no `<T>`). La prueba: ¿se entiende dentro de dos meses sin leer el cuerpo? El formato de cada nombre está en «Cómo se escribe cada nombre», más abajo.
4. **Sin `else` ni ternarios.** Se sale pronto con cláusulas de guarda (`if (…) return`) o se extrae una función con nombre. Un ternario (`c ? a : b`, `a if c else b`) es un `else` escondido: se cambia por una función con guardas o por una tabla.
5. **Pocos `if`.** Lo que cambia según un valor va en una **tabla** (patrón Strategy), no en una cadena de `if`.
6. **En JSX, guardas con nombre encadenadas con `||`**, sin `if` ni ternarios. `condicion && <Algo />` sigue valiendo.
7. **Cada capa hace una cosa:** el componente pinta, el hook orquesta, el servicio habla con la API y la librería transforma datos.
8. **Organización por funcionalidad** (`modules/<feature>/components|hooks|services|lib`); lo compartido va en `core/`. El detalle está en la skill `estructura-proyecto`.
9. **Los datos de la API se sanean en la frontera**, con valores por defecto, antes de llegar a la vista. El valor por defecto se pone con `??`, que solo salta si falta el dato (`null` o `undefined`). `||` salta también con `0`, `''` y `false`: se usa solo cuando esos valores tampoco sirven (un nombre vacío), nunca en números ni booleanos, porque una distancia de 0 o un `false` se perderían.
10. **Declarativo antes que imperativo.** En TypeScript, `map`/`filter`/`reduce` en lugar de `for`/`while`. En Python, comprensiones, `sum`, `any`, `all`, `filter` o `map` cuando el resultado es un valor (una lista, un total, un sí o un no). Un `for` se admite cuando el cuerpo es una acción con efectos (enviar, escribir, borrar) y no se construye ningún valor: una comprensión no se usa para hacer cosas. En los dos lenguajes, el bucle se queda solo si es lo más claro.
11. **Comentarios solo del porqué**, en castellano: una regla de negocio, una restricción externa, un fallo conocido de una librería o una decisión no obvia. Nunca repetir lo que hace la línea, explicar el cambio («Added this to fix…», «Ahora usamos…»), emojis, separadores ni resúmenes de archivo. Si apetece comentar qué hace algo, se cambia el nombre o se extrae una función. Docstrings solo en funciones públicas o de API, y sin repetir la firma.
12. **Se prueba el hook, no el componente**, con la estructura Preparar-Actuar-Comprobar. Los errores corregidos se apuntan en un registro de errores aprendidos.
13. **Siempre `export const`**, también en los componentes de página. Nada de `export default` (salvo donde una herramienta lo exige).
14. **Idioma:** lo técnico de React y JavaScript en inglés (`useState`, `useEffect`, `props`, `children` y los prefijos `use`, `is`, `has`, `handle`, `on`). Todo lo demás, en castellano: `pedido`, `empleado`, `marcarHecho`, `usePanelTienda`, `isEnviando`, `handleCogerPedido`.
15. **En Python, las mismas reglas que encajan:** guardas, ningún `else`, `elif` ni ternario, diccionarios en lugar de cadenas de `if`, nombres con sentido, funciones pequeñas y una responsabilidad por función. Se declara con `def`, porque en Python no hay arrow functions; `lambda` solo para expresiones de una línea.
16. **Nunca `switch` (JavaScript) ni `match` (Python).** Lo que cambia según un valor va en una tabla: un objeto o un diccionario de valores o de funciones.
17. **Nunca `catch` ni `except` repartidos por el código.** Los errores se recogen en **un único sitio por capa**:
    - **Frontend:** `core/lib/intentar.ts` convierte cualquier error en un resultado `{ valor, error }`, y el resto del código decide con guardas (`if (error) return …`). Ningún otro archivo usa `try`, `catch` ni `.catch()`.
    - **Backend:** `intentar.py` hace lo mismo con un `Resultado(valor, error)` y obliga a decir qué errores se esperan. Los demás llegan a los manejadores de excepciones de la app (en FastAPI, los de `main.py`), que traducen los errores con nombre a respuestas HTTP. `try/finally` para cerrar recursos sí se admite, porque no recoge errores.

    Implementaciones de referencia: [plantillas/intentar.ts](plantillas/intentar.ts) y [plantillas/intentar.py](plantillas/intentar.py).
18. **Sin parámetros booleanos.** `reservar(cliente, true)` no dice qué hace el `true`: se separa en dos funciones con nombre (`reservarPremium`, `reservarNormal`). Es la regla de Martin Fowler en *FlagArgument* (2011): «My general reaction to flag arguments is to avoid them».
19. **Un estado con nombre en lugar de varios booleanos.** `isCargando`, `isListo` e `isError` a la vez permiten combinaciones imposibles; un solo `estado: 'cargando' | 'listo' | 'error'` (tipo unión en TypeScript, `Literal` o `Enum` en Python) no.
20. **Sin números ni textos mágicos.** Constantes con nombre (`IVA = 0.21`, `MAX_REINTENTOS = 3`), y abstracciones solo cuando haya al menos dos usos reales: nada de interfaces «por si acaso».

**Límites que vigila la máquina** (vienen de la guía de refactorización):
- funciones de **20 líneas** como máximo (40 en los componentes de React, porque cuentan el JSX);
- **3 parámetros** como máximo; con más, un objeto con nombre (Parameter Object: un tipo en TypeScript; un `dataclass` o un modelo Pydantic en Python);
- **un solo nivel de bloques** (`if`, `for`, `while`, `try`, `with`) dentro de una función; lo que pida un segundo nivel va a otra función;
- ningún ternario, y nombres de 2 letras o más.

## Cómo se escribe cada nombre

Si el repositorio ya tiene otra convención, se respeta la del repositorio.

| Qué | Formato | Ejemplo |
|---|---|---|
| Componentes, clases, tipos, interfaces y enums (TS) | PascalCase | `TarjetaEncargo`, `EstadoEncargo`, `RepositorioEncargos` |
| Variables, funciones, métodos y propiedades (TS) | camelCase | `encargosPendientes`, `calcularTotal`, `nombreCompleto` |
| Constantes globales con valor conocido al escribir el código | UPPER_SNAKE_CASE | `MAX_REINTENTOS`, `URL_API_TRELLO` |
| Python: funciones, variables y módulos | snake_case | `calcular_total_factura`, `pedidos_pendientes` |
| Python: clases · constantes | PascalCase · UPPER_SNAKE_CASE | `Resultado` · `FILAS_POR_PAGINA` |
| SQL: tablas y columnas | snake_case | `pedidos`, `asignado_a` |
| CSS: clases · rutas de URL | kebab-case | `.tarjeta-encargo` · `/encargos-pendientes` |
| Variables de entorno | UPPER_SNAKE_CASE | `DATABASE_URL` |
| Claves de JSON y APIs | las que fije el contrato; si no hay, las del lenguaje del backend | `asignado_a` |
| Archivos | se llaman como lo que exportan | `TarjetaEncargo.tsx`, `useAvisosDePedidos.ts`, `accesoService.ts`; en Python, `orders_repository.py` |

**Regla práctica:** si se instancia o se renderiza, PascalCase; si se ejecuta o se guarda, camelCase; si es un valor fijo, UPPER_SNAKE_CASE.

### Booleanos

Mejor evitarlos: nada de parámetros booleanos (regla 18) y un estado con nombre en lugar de varios booleanos (regla 19). Cuando haga falta uno, se nombra como una afirmación en positivo, con un prefijo en inglés y el resto en castellano (regla 14):

| Prefijo | Para | TypeScript | Python |
|---|---|---|---|
| `is` | un estado o una cualidad | `isEnviando`, `isUrgente` | `is_enviando`, `is_urgente` |
| `has` | tener algo | `hasLineas`, `hasPedidosNuevos` | `has_lineas` |
| `can` | un permiso o una capacidad | `canCancelar` | `can_cancelar` |
| `should` | una decisión que se tomará | `shouldReintentar` | `should_reintentar` |

Nunca en negativo (`isNoValido`, `isSinStock`): `isValido` e `isAgotado`, y se niega con `!` o `not`. Así lo hacen Airbnb (regla 24.3, `isVal()`/`hasVal()`), Google JavaScript (6.2.3, `isFoo`/`hasFoo`), Microsoft .NET (frase afirmativa; `Is`, `Can` o `Has` donde aporte), typescript-eslint (`is`, `should`, `has`, `can`) y, en Python, Django (`is_active`, `has_perm`) y `pathlib` (`Path.is_file()`). Lo vigila el agente `conventions-reviewer`, no ESLint: comprobarlo con ESLint exige darle los tipos del proyecto.

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

### Menos `if`, ningún `else` ni ternario (cinco técnicas, en orden de preferencia)

**a) Guarda: salir pronto.**
```ts
const pedir = async (ruta: string) => {
  const response = await fetch(ruta)
  if (response.status === 204) return null
  assertRespuestaCorrecta(response)
  return response.json()
}
```

**b) La comprobación, en una función con nombre** (`assertX`, `isX`). El `if` queda dentro de una función de una línea y el código principal se lee de corrido. Es también lo que sustituye a un ternario:
```python
def codigo_del_aviso(resultado):
    if resultado.error:
        return resultado.error.code
    return "actualizado"
```

**c) Validaciones como lista de guardas que devuelven el primer error:**
```ts
const errorDeValidacion = (formulario: Formulario) => {
  if (isVacio(formulario.nombre)) return 'El nombre es obligatorio'
  if (formulario.pin.length !== LONGITUD_DEL_PIN) return 'El PIN tiene 4 cifras'
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

### Un solo nivel de bloques

Un nivel es cada bloque (`if`, `for`, `while`, `try`, `with`) que hay dentro de otro dentro de la misma función. Lo que pide un segundo nivel se saca a otra función o se resuelve con una forma declarativa:
```python
def avisar_urgentes(pedidos):
    for pedido in filter(is_urgente, pedidos):
        enviar_aviso(pedido)
```

### Errores en un único sitio

`intentar()` envuelve lo que puede fallar y, en lugar de lanzar el error, devuelve una caja con dos huecos (`valor` y `error`) de los que solo uno viene lleno. Después se decide con una guarda, como con cualquier otro dato:
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

El servicio **lanza** (`throw new Error(...)` / `raise ErrorConNombre(...)`); quien orquesta lo **recoge con `intentar`**; la vista nunca ve una excepción. En Python hay que decir qué errores se esperan: uno que no se esperaba no se traga en silencio, sigue hasta los manejadores de la app, que lo registran.

### Datos de la API: se sanean al entrar

```ts
const listaSegura = <Elemento>(valor: unknown): Elemento[] => {
  if (!Array.isArray(valor)) return []
  return valor
}

const sanearPedido = (crudo: PedidoCrudo, posicion: number): Pedido => ({
  id: crudo?.id ?? `pedido-${posicion}`,
  cliente: crudo?.cliente || 'Sin nombre',
  isUrgente: Boolean(crudo?.urgente),
})

export const modeloDelPanel = (crudo: RespuestaPanel) => ({
  pedidos: listaSegura<PedidoCrudo>(crudo?.pedidos).map(sanearPedido),
})
```

La vista nunca recibe un `null` inesperado. Cada campo tiene su valor por defecto en un solo sitio. `id` usa `??` porque solo hace falta inventarlo si no viene; `cliente` usa `||` porque un nombre vacío tampoco sirve.

### Sin mutar

```ts
const anadirPunto = (puntos: Punto[], punto: Punto) => [...puntos, punto]

// La función que recibe setPuntos solo calcula la lista nueva: ni pinta, ni pide, ni mueve nada.
setPuntos((anteriores) => anadirPunto(anteriores, punto))
```

### Comentarios

En castellano y explicando **el porqué**:
```ts
// Aquí y no en cada servicio: hay 17 servicios con su propio fetch y así un 401
// se trata igual en todos sin tocarlos uno a uno.
```
Sin banners ni separadores decorativos (`// ── Peticiones ──`, `# =====`): si un archivo necesita secciones, necesita partirse. Para quitar comentarios de relleno, emojis y otros rastros de IA, skill `limpiar-rastro-ia`.

### Pruebas

- **El hook, con `renderHook`**, no el componente: si el hook funciona, el componente pinta bien.
- **Vitest + Testing Library + MSW** en el frontend, con los mocks apuntando a la misma URL base que el código. **pytest** en el backend, contra una base de pruebas aislada (nunca la de desarrollo).
- **Caso correcto y caso de error** en cada hook o endpoint.
- **Los mocks se reinician antes de cada prueba**, con un comentario que explica el porqué: evitar pruebas que fallen según el orden.
- Para escribirlas está el agente `test-writer` de este plugin.

### Formato y herramientas

- **Prettier:** sin punto y coma, comillas simples, 2 espacios, 100 caracteres por línea y coma final `es5` ([plantillas/.prettierrc](plantillas/.prettierrc)).
- **ESLint** con las reglas de la norma que la máquina sabe comprobar ([plantillas/eslint.config.js](plantillas/eslint.config.js)): sin `else`, ternarios, `switch`, `function`, `export default` ni `try`; un nivel de bloques; 3 parámetros; 20 líneas; nombres.
- **Ruff** en Python, con 100 caracteres, nombres y 3 parámetros como máximo ([plantillas/ruff.toml](plantillas/ruff.toml)). Lo que Ruff no sabe comprobar (ningún `else`/`elif`/ternario/`match`, `except` solo en `intentar.py`, 20 líneas, un nivel de bloques y que cada excepción tenga su porqué) lo vigila una prueba con `ast` ([plantillas/test_norma_estilo.py](plantillas/test_norma_estilo.py)).
- **En la CI:** lint, formato y la prueba de la norma, para que lo que se puede comprobar lo compruebe la máquina y no la memoria.
- **Al terminar cada turno**, si está activado, el hook de cierre del plugin pasa el formateador y el linter del proyecto a los archivos cambiados (o un comprobador ligero si el proyecto no los tiene) y devuelve lo que falle.
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
- **Efectos dentro de `setX((anterior) => …)`** (pintar en un mapa, pedir a la API, mover la cámara): esa función solo calcula el valor nuevo, porque React puede ejecutarla dos veces y entonces se repiten las peticiones y los dibujos. Los efectos van en un `useEffect` que vigile ese estado.

## Al refactorizar: el comportamiento no cambia

Separar un parámetro booleano en dos funciones, quitar un ternario o convertir una cadena de `if` en una tabla cambia la forma del código y puede cambiar lo que hace sin que se note. Antes de darlo por bueno se comprueba que se mantienen:

- **las prioridades:** si antes un caso ganaba a otro (un `if` antes que su `elif`), sigue ganando; al separar en dos funciones, alguien tiene que seguir decidiendo cuál se aplica;
- **los valores por defecto:** lo que pasaba con una clave que no está en la tabla, con `null` o `None`, con una lista vacía o con un cero;
- **los casos excluyentes:** lo que antes era uno u otro no puede pasar a sumarse los dos;
- **el orden de las operaciones** (aplicar el IVA antes o después de un recargo) y **la API pública:** quien llamaba a la función de antes tiene cómo obtener el mismo resultado.

**Si no hay una prueba que cubra ese comportamiento, primero se escribe la prueba (en verde con el código de antes) y después se refactoriza.** Cualquier cambio de comportamiento que quede, aunque lo pida la norma, se dice en la respuesta.

## Al terminar de escribir código

Repasar los límites (20 líneas, 3 parámetros, un nivel de bloques, sin `else`, ternarios, `switch`, `match` ni `catch` fuera de `intentar`), pasar el lint y las pruebas, y pedir revisión del diff al agente `conventions-reviewer` (la norma y las excepciones nuevas) y, si hay duda de calidad general, a `craft-reviewer`.
