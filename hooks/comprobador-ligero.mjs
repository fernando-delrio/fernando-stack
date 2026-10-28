// Comprobador para proyectos sin ESLint ni Ruff configurados. Trabaja línea a línea, sin
// analizar el código de verdad: puede fallar con textos largos o docstrings, y por eso solo
// avisa de lo que la norma prohíbe sin excepción, de la sangría y de los nombres.
import { readFileSync } from 'node:fs'
import { basename, extname } from 'node:path'

const MAX_NIVELES_DE_BLOQUE = 1
const AVISO_TRY = 'try/catch fuera de intentar(): usa intentar() y una guarda'
const AVISO_EXCEPT = 'except fuera de intentar.py: usa intentar() y una guarda'
const AVISO_SANGRIA = 'más de un nivel de bloques: extrae una función'

const REGLAS_TS = [
  { patron: /\belse\b/, aviso: 'else: usa una guarda o una función con nombre' },
  { patron: /\bswitch\s*\(/, aviso: 'switch: usa una tabla (objeto de valores o de funciones)' },
  { patron: /\s\?\s[^:]+\s:\s/, aviso: 'ternario: usa una función con guardas o una tabla' },
  { patron: /\bfunction\b/, aviso: 'function: usa una arrow function con nombre' },
  { patron: /\bexport\s+default\b/, aviso: 'export default: usa export const' },
  { patron: /\btry\s*\{|\.catch\(/, aviso: AVISO_TRY },
  { patron: /\b(const|let)\s+[a-z]+_[a-z0-9_]*\s*=/, aviso: 'snake_case en TypeScript: usa camelCase' },
  { patron: /\b(interface|type|class|enum)\s+[a-z]/, aviso: 'tipos, clases, interfaces y enums en PascalCase' },
  { patron: /<[A-Z]\s*[,>]/, aviso: 'genérico de una letra: ponle nombre (<Respuesta>, <Datos>)' },
  { patron: /\bvar\s/, aviso: 'var: usa const' },
]

const REGLAS_PY = [
  { patron: /^\s*(else|elif)\b/, aviso: 'else/elif: usa una guarda o una función con nombre' },
  { patron: /^\s*match\s+.+:\s*$/, aviso: 'match: usa un diccionario de valores o de funciones' },
  { patron: /\sif\s.+\selse\s/, aviso: 'ternario: usa una función con guardas o un diccionario' },
  { patron: /^\s*except\b/, aviso: AVISO_EXCEPT },
  { patron: /^\s*(async\s+)?def\s+(?![a-z_][a-z0-9_]*\s*[([])/, aviso: 'funciones en snake_case' },
  { patron: /^\s*class\s+(?![A-Z][A-Za-z0-9]*\b)/, aviso: 'clases en PascalCase' },
  { patron: /^\s*[a-z]+[A-Z]\w*\s*=(?!=)/, aviso: 'camelCase en Python: usa snake_case' },
]

// Las reglas de errores no se aplican al archivo que está hecho para recogerlos.
const ARCHIVOS_DE_INTENTAR = new Set(['intentar.ts', 'intentar.js', 'intentar.mjs', 'intentar.py'])
const AVISOS_DE_ERRORES = new Set([AVISO_TRY, AVISO_EXCEPT])

const LENGUAJE_POR_EXTENSION = {
  '.ts': 'ts',
  '.tsx': 'ts',
  '.js': 'ts',
  '.jsx': 'ts',
  '.mjs': 'ts',
  '.py': 'py',
}

const SINTAXIS = {
  ts: {
    reglas: REGLAS_TS,
    comentario: /\/\/.*$/,
    abreBloque: /^\s*(\}\s*)?(if|for|while|do|try|catch|finally|else)\b/,
    abreFuncion: /(=>\s*\{|\bfunction\b.*\{)\s*$/,
    permiteSangria: /eslint-disable(-next)?-line\s+[^-]*\bmax-depth\b.*--\s+\S/,
  },
  py: {
    reglas: REGLAS_PY,
    comentario: /#.*$/,
    abreBloque: /^\s*(if|elif|else|for|while|try|except|finally|with|async\s+(for|with))\b.*:\s*(#.*)?$/,
    abreFuncion: /^\s*(async\s+)?def\s/,
    permiteSangria: /#\s*norma:\s*permitir\s+profundidad\s+--\s+\S/,
  },
}

const CADENA_DE_TEXTO = /(["'`])(?:\\.|(?!\1).)*\1/g

const sinTextosNiComentarios = (linea, sintaxis) =>
  linea.replace(CADENA_DE_TEXTO, '""').replace(sintaxis.comentario, '')

const sangriaDe = (linea) => linea.length - linea.trimStart().length

const isAvisoAplicable = (ruta) => (aviso) =>
  !ARCHIVOS_DE_INTENTAR.has(basename(ruta)) || !AVISOS_DE_ERRORES.has(aviso)

const avisosDeReglas = (codigo, sintaxis, ruta) =>
  sintaxis.reglas
    .filter(({ patron }) => patron.test(codigo))
    .map(({ aviso }) => aviso)
    .filter(isAvisoAplicable(ruta))

// Cuenta los bloques abiertos desde la última función: así una función nueva empieza en cero,
// igual que max-depth de ESLint.
const nivelesDentroDeLaFuncion = (abiertos) =>
  abiertos.length - abiertos.findLastIndex((bloque) => bloque.isFuncion) - 1

// La marca encima de una función vale para toda ella; encima de un bloque, solo para ese.
const bloqueDeLaLinea = (codigo, sangria, { sintaxis, isPermitido }) => {
  if (sintaxis.abreFuncion.test(codigo)) return { sangria, isFuncion: true, isPermitido }
  if (sintaxis.abreBloque.test(codigo)) return { sangria, isFuncion: false, isPermitido }
  return null
}

const isFuncionPermitida = (abiertos) => Boolean(abiertos.findLast((bloque) => bloque.isFuncion)?.isPermitido)

const isDemasiadoProfundo = (bloque, abiertos) =>
  Boolean(bloque) &&
  !bloque.isFuncion &&
  !bloque.isPermitido &&
  !isFuncionPermitida(abiertos) &&
  nivelesDentroDeLaFuncion(abiertos) >= MAX_NIVELES_DE_BLOQUE

const avanzarLinea = (sintaxis, nombre) => (estado, { texto, anterior, numero }) => {
  const codigo = sinTextosNiComentarios(texto, sintaxis)
  if (!codigo.trim()) return estado
  const sangria = sangriaDe(texto)
  const abiertos = estado.pila.filter((bloque) => bloque.sangria < sangria)
  const isPermitido = sintaxis.permiteSangria.test(anterior)
  const bloque = bloqueDeLaLinea(codigo, sangria, { sintaxis, isPermitido })
  const avisoDeSangria = isDemasiadoProfundo(bloque, abiertos) && AVISO_SANGRIA
  const avisos = [...avisosDeReglas(codigo, sintaxis, nombre), avisoDeSangria].filter(Boolean)
  return {
    pila: [...abiertos, bloque].filter(Boolean),
    avisos: [...estado.avisos, ...avisos.map((texto) => ({ nombre, desde: numero, hasta: numero, texto }))],
  }
}

const lineasNumeradas = (contenido) =>
  contenido.split(/\r?\n/).map((texto, posicion, lineas) => ({
    texto,
    anterior: lineas[posicion - 1] ?? '',
    numero: posicion + 1,
  }))

// nombre es la ruta que verá el agente, normalmente relativa a la raíz del repo. Cada aviso dice
// sus líneas (desde, hasta) para que el hook se quede solo con los que tocan lo cambiado.
export const comprobarArchivo = ({ ruta, nombre }) => {
  const sintaxis = SINTAXIS[LENGUAJE_POR_EXTENSION[extname(ruta)]]
  if (!sintaxis) return []
  const lineas = lineasNumeradas(readFileSync(ruta, 'utf8'))
  return lineas.reduce(avanzarLinea(sintaxis, nombre), { pila: [], avisos: [] }).avisos
}
