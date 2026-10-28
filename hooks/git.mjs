import { existsSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import { ejecutar } from './ejecutar.mjs'

export const EXTENSIONES_TS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs'])
export const EXTENSIONES_PY = new Set(['.py'])

// null significa «el archivo entero»: es nuevo, o el repo aún no tiene commits.
export const TODAS_LAS_LINEAS = null

const HUNK = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm

export const raizDelRepo = (carpeta) =>
  ejecutar('git', ['rev-parse', '--show-toplevel'], carpeta).valor?.trim()

// «R viejo -> nuevo» en los renombrados; las rutas con espacios llegan entre comillas.
const rutaDeLaLinea = (linea) => linea.slice(3).split(' -> ').at(-1).replace(/^"|"$/g, '')

const isCodigo = (ruta) => EXTENSIONES_TS.has(extname(ruta)) || EXTENSIONES_PY.has(extname(ruta))

const isBorrado = (linea) => linea.startsWith(' D') || linea.startsWith('D')

export const archivosCambiados = (raiz) =>
  (ejecutar('git', ['status', '--porcelain', '-uall'], raiz).valor ?? '')
    .split(/\r?\n/)
    .filter((linea) => linea.trim() && !isBorrado(linea))
    .map((linea) => resolve(raiz, rutaDeLaLinea(linea)))
    .filter((ruta) => isCodigo(ruta) && existsSync(ruta))

const rangoDelHunk = ([, inicio, cuenta = '1']) => [Number(inicio), Number(inicio) + Number(cuenta) - 1]

// Las líneas añadidas o cambiadas respecto a HEAD, como rangos [desde, hasta].
export const lineasCambiadas = (raiz, ruta) => {
  const { valor, error } = ejecutar('git', ['diff', '-U0', '--no-color', 'HEAD', '--', ruta], raiz)
  if (error || !valor.trim()) return TODAS_LAS_LINEAS
  return [...valor.matchAll(HUNK)].map(rangoDelHunk).filter(([desde, hasta]) => hasta >= desde)
}
