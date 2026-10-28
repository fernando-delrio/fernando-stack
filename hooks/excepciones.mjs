// La norma admite excepciones locales si la regla empeora la lectura, siempre con su porqué en
// la misma línea. Algunas reglas no admiten ninguna porque siempre hay una alternativa legible.
import { readFileSync } from 'node:fs'
import { extname } from 'node:path'

// no-restricted-syntax lleva else, function, export default, switch y try/catch.
const REGLAS_ESLINT_SIN_EXCEPCION = new Set([
  'no-restricted-syntax',
  'no-ternary',
  'no-nested-ternary',
  'func-style',
  'prefer-arrow-callback',
  'no-var',
])
const REGLAS_PYTHON_CON_EXCEPCION = new Set(['profundidad', 'lineas', 'parametros'])

const DESACTIVACION_ESLINT = /eslint-disable(?:-next-line|-line)?(?<reglas>[^*\n]*?)(?:\s--\s(?<porque>.*))?\s*(?:\*\/)?\s*$/
const MARCA_DE_NORMA = /#\s*norma:\s*permitir\s+(?<regla>[\w-]+)(?:\s+--\s+(?<porque>\S.*))?/
const NOQA = /#\s*noqa\b(?<resto>.*)$/

const reglasDe = (texto) => texto.split(',').map((regla) => regla.trim()).filter(Boolean)

const avisosDeEslint = ({ reglas, porque }) => [
  reglasDe(reglas).length === 0 && 'eslint-disable sin regla: di qué regla se desactiva',
  !porque?.trim() && 'excepción sin porqué: añade « -- <porqué>»',
  reglasDe(reglas).some((regla) => REGLAS_ESLINT_SIN_EXCEPCION.has(regla)) &&
    'esa regla no admite excepciones (else, ternarios, switch, try/catch, function, export default)',
]

const avisosDeMarca = ({ regla, porque }) => [
  !REGLAS_PYTHON_CON_EXCEPCION.has(regla) &&
    `«${regla}» no admite excepciones; solo profundidad, lineas o parametros`,
  !porque && 'excepción sin porqué: añade « -- <porqué>»',
]

const avisosDeNoqa = ({ resto }) => [
  !/:\s*[A-Z]+\d+/.test(resto) && 'noqa sin código: di qué regla de Ruff se desactiva',
  !/\s--\s+\S/.test(resto) && 'excepción sin porqué: añade « -- <porqué>»',
]

const COMPROBACIONES = {
  ts: [{ patron: DESACTIVACION_ESLINT, avisos: avisosDeEslint }],
  py: [
    { patron: MARCA_DE_NORMA, avisos: avisosDeMarca },
    { patron: NOQA, avisos: avisosDeNoqa },
  ],
}

const LENGUAJE_POR_EXTENSION = { '.ts': 'ts', '.tsx': 'ts', '.js': 'ts', '.jsx': 'ts', '.mjs': 'ts', '.py': 'py' }

const avisosSiCoincide = (comprobaciones) => (texto) =>
  comprobaciones
    .filter(({ patron }) => patron.test(texto))
    .flatMap(({ patron, avisos }) => avisos(texto.match(patron).groups))
    .filter(Boolean)

export const comprobarExcepciones = ({ ruta, nombre }) => {
  const comprobaciones = COMPROBACIONES[LENGUAJE_POR_EXTENSION[extname(ruta)]]
  if (!comprobaciones) return []
  const avisosDe = avisosSiCoincide(comprobaciones)
  return readFileSync(ruta, 'utf8')
    .split(/\r?\n/)
    .flatMap((linea, posicion) =>
      avisosDe(linea).map((texto) => ({ nombre, desde: posicion + 1, hasta: posicion + 1, texto }))
    )
}
