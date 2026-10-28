# Antes y después, regla a regla

Ejemplos de la norma de [SKILL.md](SKILL.md). Cada «después» cumple todas las reglas a la vez.

## `else` → guarda

```ts
// Antes
const precioFinal = (pedido: Pedido) => {
  if (pedido.isPagado) {
    return 0
  } else {
    return pedido.importe
  }
}

// Después
const precioFinal = (pedido: Pedido) => {
  if (pedido.isPagado) return 0
  return pedido.importe
}
```

```python
# Antes
def precio_final(pedido):
    if pedido.is_pagado:
        return 0
    else:
        return pedido.importe


# Después
def precio_final(pedido):
    if pedido.is_pagado:
        return 0
    return pedido.importe
```

## Ternario → función con guardas o tabla

```ts
// Antes
const etiqueta = pedido.isUrgente ? 'Urgente' : 'Normal'

// Después
const etiquetaDelPedido = (pedido: Pedido) => {
  if (pedido.isUrgente) return 'Urgente'
  return 'Normal'
}
```

```python
# Antes
return resultado.error.code if resultado.error else "actualizado"


# Después
def codigo_del_aviso(resultado):
    if resultado.error:
        return resultado.error.code
    return "actualizado"
```

En JSX, guardas con nombre (regla 6):

```tsx
// Antes
return isCargando ? <Aviso texto="Cargando…" /> : <ListaDePedidos pedidos={pedidos} />

// Después
const cargando = (isCargando: boolean) => isCargando && <Aviso texto="Cargando…" />

return cargando(isCargando) || <ListaDePedidos pedidos={pedidos} />
```

## `switch` / `match` → tabla

```ts
// Antes
const etiquetaDelEstado = (estado: string) => {
  switch (estado) {
    case 'pendiente':
      return 'Pendiente'
    case 'listo':
      return 'Listo'
    default:
      return 'Desconocido'
  }
}

// Después
const ETIQUETA_POR_ESTADO: Record<string, string> = { pendiente: 'Pendiente', listo: 'Listo' }

export const etiquetaDelEstado = (estado: string) => ETIQUETA_POR_ESTADO[estado] ?? 'Desconocido'
```

```python
# Antes
def tipo_de_cliente(codigo):
    match codigo:
        case "T":
            return "taller"
        case _:
            return "desconocido"


# Después
TIPO_POR_CODIGO = {"T": "taller", "P": "particular"}


def tipo_de_cliente(codigo):
    return TIPO_POR_CODIGO.get(codigo, "desconocido")
```

## `if` anidados → un nivel

```ts
// Antes
const avisarUrgentes = (pedidos: Pedido[]) => {
  for (const pedido of pedidos) {
    if (pedido.isUrgente) {
      enviarAviso(pedido)
    }
  }
}

// Después
const avisarUrgentes = (pedidos: Pedido[]) =>
  pedidos.filter((pedido) => pedido.isUrgente).forEach(enviarAviso)
```

```python
# Antes
def avisar_urgentes(pedidos):
    for pedido in pedidos:
        if pedido.is_urgente:
            enviar_aviso(pedido)


# Después: el for se queda porque el cuerpo es una acción, no un valor (regla 10)
def avisar_urgentes(pedidos):
    for pedido in filter(is_urgente, pedidos):
        enviar_aviso(pedido)
```

## Bucle que construye un valor → forma declarativa

```ts
// Antes
let total = 0
for (let posicion = 0; posicion < lineas.length; posicion++) {
  total += lineas[posicion].precio * lineas[posicion].cantidad
}

// Después
const importeDeLinea = (linea: Linea) => linea.precio * linea.cantidad
const total = lineas.map(importeDeLinea).reduce((suma, importe) => suma + importe, 0)
```

```python
# Antes
def importes_pagados(facturas):
    resultado = []
    for factura in facturas:
        if factura["pagada"]:
            resultado.append(factura["importe"])
    return resultado


# Después
def importes_pagados(facturas):
    return [factura["importe"] for factura in facturas if factura["pagada"]]
```

## `try/catch` repartido → `intentar()`

```ts
// Antes
const cargarPedidos = async () => {
  try {
    const pedidos = await pedirJson<Pedido[]>('/api/pedidos')
    setPedidos(pedidos)
  } catch (fallo) {
    setError('No se pudieron cargar los pedidos')
  }
}

// Después
const cargarPedidos = async () => {
  const { valor: pedidos, error } = await intentar(pedirJson<Pedido[]>('/api/pedidos'))
  if (error) return setError('No se pudieron cargar los pedidos')
  setPedidos(pedidos)
}
```

```python
# Antes
def leer_factura(texto):
    try:
        return json.loads(texto)
    except ValueError:
        return None


# Después
def leer_factura(texto):
    resultado = intentar(lambda: json.loads(texto), ValueError)
    if resultado.error:
        return None
    return resultado.valor
```

## `function` → arrow function · `export default` → `export const`

```ts
// Antes
export default function TarjetaEncargo({ encargo }: Props) {
  return <article>{encargo.titulo}</article>
}

// Después
export const TarjetaEncargo = ({ encargo }: Props) => <article>{encargo.titulo}</article>
```

## Más de 3 parámetros → un objeto con nombre

```ts
// Antes
const crearPedido = (cliente: string, telefono: string, pieza: string, cantidad: number) => { … }

// Después
type DatosDelPedido = { cliente: string; telefono: string; pieza: string; cantidad: number }

const crearPedido = (datos: DatosDelPedido) => { … }
```

```python
# Antes
def crear_pedido(cliente, telefono, pieza, cantidad): ...


# Después
@dataclass(frozen=True)
class DatosDelPedido:
    cliente: str
    telefono: str
    pieza: str
    cantidad: int


def crear_pedido(datos: DatosDelPedido): ...
```

## Parámetro booleano → dos funciones

```ts
// Antes
const reservar = (cliente: Cliente, isPremium: boolean) => { … }
reservar(cliente, true)

// Después
const reservarPremium = (cliente: Cliente) => { … }
const reservarNormal = (cliente: Cliente) => { … }
```

```python
# Antes
def calcular_total(lineas, con_iva): ...


# Después
def calcular_total_sin_iva(lineas): ...


def calcular_total_con_iva(lineas):
    return calcular_total_sin_iva(lineas) * (1 + IVA)
```

Antes de dar por bueno el «después», una prueba que fije lo que hacía el «antes» (prioridades, valores por defecto, casos excluyentes): ver «Al refactorizar» en SKILL.md.

```python
# Antes: el VIP gana al taller porque va primero
def calcular_descuento(cliente, importe, is_vip):
    if is_vip:
        return importe * 0.15
    elif cliente == "taller":
        return importe * 0.05
    return 0


# Después: el booleano pasa a ser un dato del cliente y la prioridad sigue en un solo sitio
def calcular_descuento_vip(importe):
    return importe * DESCUENTO_VIP


def calcular_descuento_por_tipo(tipo, importe):
    return importe * DESCUENTO_POR_TIPO.get(tipo, 0)


def calcular_descuento(cliente, importe):
    if cliente.is_vip:
        return calcular_descuento_vip(importe)
    return calcular_descuento_por_tipo(cliente.tipo, importe)


# La prueba fija el resultado antes de tocar nada (con la firma de entonces) y se adapta a la nueva.
def test_un_taller_vip_tiene_solo_el_descuento_vip():
    assert calcular_descuento(Cliente(tipo="taller", is_vip=True), 100) == 15
```

## Booleanos bien nombrados

```ts
// Antes
const noValido = !formulario.nombre
const stock = pieza.unidades > 0
const cancelable = (pedido: Pedido) => pedido.estado === 'pendiente'

// Después
const isValido = Boolean(formulario.nombre)
const hasStock = pieza.unidades > 0
const canCancelar = (pedido: Pedido) => pedido.estado === 'pendiente'
```

```python
# Antes
def comprobar(pedido): return pedido.unidades > 0


# Después
def has_stock(pedido):
    return pedido.unidades > 0
```

## Varios booleanos → un estado con nombre

```ts
// Antes
const [isCargando, setIsCargando] = useState(true)
const [isError, setIsError] = useState(false)

// Después
type EstadoDeLaCarga = 'cargando' | 'listo' | 'error'
const [estado, setEstado] = useState<EstadoDeLaCarga>('cargando')
```

```python
# Antes
pedido.is_pendiente = False
pedido.is_listo = True


# Después
EstadoDelPedido = Literal["pendiente", "en_curso", "listo"]
pedido.estado = "listo"
```

## Números y textos mágicos → constantes

```ts
// Antes
if (intentos > 3) bloquear()
const total = base * 1.21

// Después
const MAX_REINTENTOS = 3
const IVA = 0.21
if (intentos > MAX_REINTENTOS) bloquear()
const total = base * (1 + IVA)
```

```python
# Antes
descuento = importe * 0.15


# Después
DESCUENTO_VIP = 0.15
descuento = importe * DESCUENTO_VIP
```

## Nombres crípticos → nombres que se explican

```ts
// Antes
const tmp2 = usr.data1.filter((x) => x.ok)

// Después
const pedidosConfirmados = cliente.pedidos.filter((pedido) => pedido.isConfirmado)
```

```python
# Antes
def proc(d): ...


# Después
def calcular_total_factura(factura): ...
```

## Genérico de una letra → genérico con nombre

```ts
// Antes
const pedirJson = async <T>(url: string): Promise<T> => …

// Después
const pedirJson = async <Respuesta>(url: string): Promise<Respuesta> => …
```

## Comentario de IA → nombre claro

```ts
// Antes
// Added this to fix the total bug
// función para calcular el total con IVA
const calc = (lineas: Linea[]) => …

// Después
const calcularTotalConIva = (lineas: Linea[]) => …
```

```python
# Antes
# ===== Utilidades =====
# Ahora usamos un descuento para los clientes buenos
def desc(c): ...


# Después
# Los talleres con más de 20 pedidos al año tienen descuento (acuerdo comercial de 2026).
def descuento_por_volumen(cliente): ...
```

## Función larga → funciones con nombre

```python
# Antes: 40 líneas que validan, calculan y guardan


# Después
def registrar_pedido(datos):
    assert_pedido_valido(datos)
    pedido = pedido_con_importes(datos)
    return repositorio.guardar(pedido)
```

## Una excepción legítima, con su porqué

La marca va justo encima de la función (vale para toda ella) o del bloque concreto:

```python
# norma: permitir profundidad -- bucle de lectura ASGI con salidas tempranas; partirlo esconde el protocolo
async def _leer_cuerpo_limitado(receive):
    trozos = []
    while True:
        message = await receive()
        if message["type"] == "http.disconnect":
            return None
        ...
```

```ts
// eslint-disable-next-line max-depth -- recorrido de una matriz 2D; separarlo duplica los índices
```

`else`, ternarios, `switch`/`match`, `try` fuera de `intentar`, `function` y `export default` no tienen excepción.
