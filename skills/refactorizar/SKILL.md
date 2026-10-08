---
name: refactorizar
description: Guía de refactorización de Fernando (basada en refactoring.guru) y el método para aplicarla sin romper nada. Úsala cuando Fernando pida refactorizar, limpiar, ordenar o pasar código a su norma de estilo, o cuando al revisar código aparezcan code smells (funciones largas, if anidados, código duplicado, demasiados parámetros, switch, catch repartidos).
---

# Cómo refactorizar — la guía de Fernando

## La regla de oro

**Refactorizar es cambiar la estructura del código sin cambiar su comportamiento.** Si cambia lo que hace, ya no es refactorizar: es reescribir o añadir una funcionalidad.

## Cómo hacerlo bien

- **Pruebas primero.** Sin pruebas que pasen antes y después, no sabes si has roto algo. Si el trozo que vas a tocar no tiene pruebas, se escriben antes de cambiarlo.
- **Pasos pequeños.** Un cambio, las pruebas, un commit. Y otra vez.
- **No mezcles refactorización con funcionalidades.** Van en commits o PR separados.
- **El código debe quedar más limpio, no solo distinto.** Si no mejora la legibilidad o el mantenimiento, no se toca.

## Cuándo refactorizar

- **Regla de tres:** la primera vez lo haces, la segunda lo duplicas con reparo y la tercera refactorizas.
- Antes de añadir una funcionalidad, si el código actual lo dificulta.
- Al arreglar un error, si estaba escondido por código confuso.
- En la revisión de código.

## El método (probado en primer-equipo-ai, 07/10/2026)

1. **Rama propia:** `refactor/<lo-que-se-ordena>`, que sale de `main` actualizado. Nunca `claude/` ni `codex/` en el nombre.
2. **La suite en verde antes de empezar.** Se anota cuántas pruebas pasan: ese número no puede bajar.
3. **Primero, las herramientas que vigilan la norma:** ESLint y Prettier en el frontend, y Ruff y la prueba de la norma en Python (plantillas en la skill `estilo-codigo`). Así la máquina dice qué falta, en vez de la memoria. Se mide cuántos incumplimientos hay al empezar.
4. **Después, el código, módulo a módulo,** con las pruebas en verde y un commit tras cada módulo.
5. **Cuando la salida importa byte a byte** (un PDF, un CSV, una respuesta de API), se guarda la salida de antes y se compara con la de después. En primer-equipo-ai el PDF salió idéntico en 5 tipos de pedido.
6. **Los cambios de comportamiento que aparezcan** (un error que se tragaba, una validación que faltaba) no se arreglan a escondidas: se apuntan y se hacen en un paso aparte, o se pregunta.
7. **Al terminar:**
   - lint, formato y pruebas en verde;
   - en el plan del proyecto, la tarea marcada con `[x]` y la fecha;
   - en la bitácora, el porqué de las decisiones;
   - a Fernando, los comandos de commit, porque los commits los hace él.
8. **Para revisar el resultado:** agentes `conventions-reviewer` (la norma) y `craft-reviewer` (calidad general).

Los cambios que tocan casi todas las pruebas (por ejemplo, renombrar las funciones de todo el backend) van en un paso y una rama propios.

## Qué buscar: los *code smells*

**Código inflado (Bloaters)**
- **Long Method:** funciones largas. Si necesitas un comentario para explicar un bloque, ese bloque es una función.
- **Large Class:** la clase o el módulo hace demasiadas cosas.
- **Primitive Obsession:** textos o números sueltos donde debería haber un objeto o una enumeración, como estados del tipo `"pending"` repartidos por todo el código.
- **Long Parameter List:** más de 3 parámetros.
- **Data Clumps:** los mismos datos viajan siempre juntos (por ejemplo `user_id`, `tenant_id` y `role`), así que deberían ser un objeto.

**Mal uso de la orientación a objetos (Object-Orientation Abusers)**
- **Switch Statements:** `if`/`elif` o `switch` largos sobre un tipo. Suelen pedir una tabla de funciones o polimorfismo.
- **Temporary Field:** atributos que solo tienen valor a veces.
- **Refused Bequest:** la subclase hereda cosas que no usa.
- **Alternative Classes with Different Interfaces:** dos clases hacen lo mismo con métodos distintos.

**Lo que impide cambiar (Change Preventers)**
- **Divergent Change:** un módulo cambia por muchos motivos distintos.
- **Shotgun Surgery:** un cambio obliga a tocar 10 archivos.
- **Parallel Inheritance Hierarchies:** crear una subclase obliga a crear otra en paralelo.

**Lo que sobra (Dispensables)**
- **Duplicate Code.**
- **Dead Code:** código que nadie llama.
- **Lazy Class:** la clase no aporta lo suficiente para existir.
- **Speculative Generality:** abstracciones «por si acaso».
- **Comentarios que tapan código malo.**
- **Data Class:** solo datos, sin comportamiento.

**Acoplamiento (Couplers)**
- **Feature Envy:** una función usa más datos de otro módulo que del suyo.
- **Inappropriate Intimacy:** dos módulos se meten en los detalles internos del otro.
- **Message Chains:** `a.b().c().d()`.
- **Middle Man:** una clase o un módulo que solo delega.

## Técnicas: cómo arreglarlo

| Grupo | Técnicas |
|---|---|
| Componer funciones | Extract Method / Inline Method · Extract Variable (dar nombre a expresiones complejas) · Replace Temp with Query · Replace Method with Method Object (para funciones monstruo) |
| Mover responsabilidades | Move Method / Move Field · Extract Class / Inline Class · Hide Delegate / Remove Middle Man |
| Organizar datos | Replace Magic Number with Symbolic Constant · Replace Type Code with Class / Subclasses / State-Strategy · Encapsulate Field / Encapsulate Collection · Replace Data Value with Object |
| Simplificar condicionales | Decompose Conditional (extraer la condición y las ramas a funciones con nombre) · Consolidate Conditional Expression · Replace Nested Conditional with Guard Clauses · Replace Conditional with Polymorphism · Introduce Null Object |
| Simplificar llamadas | **Rename Method** (la más infravalorada) · Introduce Parameter Object / Preserve Whole Object · Separate Query from Modifier (una función devuelve datos o cambia estado, no las dos cosas) · Replace Error Code with Exception |
| Generalización | Pull Up / Push Down Method · Extract Superclass / Extract Interface · Replace Inheritance with Delegation (mejor composición que herencia) |

Con la norma de Fernando, dos técnicas tienen su forma propia:
- **Switch Statements y Replace Conditional with Polymorphism:** primero se intenta con **una tabla** (objeto o diccionario de valores o funciones); las clases, solo si la tabla no basta.
- **Replace Error Code with Exception:** el servicio lanza un error con nombre y quien orquesta lo recoge con `intentar()` (regla 17). Nunca un `catch` en medio del código.

## Lista rápida por archivo

- [ ] ¿Hay funciones de más de 20 líneas? → Extract Method.
- [ ] ¿Hay nombres que no explican qué hacen? → Rename.
- [ ] ¿Hay código duplicado? → Extraer y reutilizar.
- [ ] ¿Hay `if` anidados en 3 o más niveles? ¿Algún `else`? → Guard clauses.
- [ ] ¿Hay un `switch`, un `match` o una cadena de `if` sobre un valor? → Tabla.
- [ ] ¿Hay un `catch` o un `except` fuera de `intentar`? → `intentar()` y una guarda.
- [ ] ¿Hay textos o números mágicos? → Constantes o enumeraciones.
- [ ] ¿Alguna función recibe 4 o más parámetros? → Parameter Object: en Python, un `dataclass` o un modelo Pydantic; en TypeScript, un tipo con nombre.
- [ ] ¿Algún módulo mezcla responsabilidades, como un endpoint que valida, consulta la base de datos y formatea? → Extract Class o separar en capas.
- [ ] ¿Hay código muerto o comentado? → Borrarlo; para eso está git.
