// Las herramientas del proyecto en modo norma: formatean y comprueban los archivos cambiados y
// devuelven cada fallo con sus líneas, para quedarse solo con los que tocan lo cambiado.
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { comprobarArchivo } from './comprobador-ligero.mjs'
import { ejecutar, salidaDe, textoDelFallo } from './ejecutar.mjs'
import { intentar } from './intentar.mjs'

const CONFIGS_DE_ESLINT = ['eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs', 'eslint.config.ts']
const ESLINT = join('node_modules', 'eslint', 'bin', 'eslint.js')
const PRETTIER = join('node_modules', 'prettier', 'bin', 'prettier.cjs')
export const PRUEBA_DE_LA_NORMA = join('tests', 'test_norma_estilo.py')
// -vv sin -q: con -q pytest recorta las listas largas y se perderían ubicaciones.
const ARGUMENTOS_DE_LA_PRUEBA = ['-vv', '--tb=short', '--no-header', '-p', 'no:cacheprovider']
const CARPETA_DEL_HOOK = dirname(fileURLToPath(import.meta.url))
const BUSCADOR_DE_RASTRO = join(CARPETA_DEL_HOOK, '..', 'skills', 'limpiar-rastro-ia', 'buscar_rastro_ia.py')
const UBICACION_EN_LA_PRUEBA = /([\w./\\-]+\.py):(\d+)(?:-(\d+))?/g
const CABECERA_DE_PRUEBA = /_{3,} (test_\w+) _{3,}/
const INICIO_DEL_RESUMEN = /^=+ short test summary info =+/

export const nombreEnElRepo = (raiz, ruta) => relative(raiz, ruta).replaceAll('\\', '/')

export const conNombre = (raiz) => (ruta) => ({ ruta, nombre: nombreEnElRepo(raiz, ruta) })

// Un aviso que no se puede situar en una línea (una herramienta rota) se enseña siempre.
const avisoGeneral = (texto) => ({ nombre: '', desde: 0, hasta: Infinity, isGeneral: true, texto })

const leerJson = (texto) => intentar(() => JSON.parse(texto)).valor

const buscarHaciaArriba = (carpeta, raiz, cumple) => {
  if (cumple(carpeta)) return carpeta
  if (carpeta === raiz || dirname(carpeta) === carpeta) return null
  return buscarHaciaArriba(dirname(carpeta), raiz, cumple)
}

const hasEslint = (carpeta) =>
  existsSync(join(carpeta, ESLINT)) && CONFIGS_DE_ESLINT.some((nombre) => existsSync(join(carpeta, nombre)))

const avisosDeEslint = (raiz) => (archivo) =>
  archivo.messages.map((mensaje) => ({
    nombre: nombreEnElRepo(raiz, archivo.filePath),
    desde: mensaje.line ?? 0,
    hasta: mensaje.endLine ?? mensaje.line ?? 0,
    texto: `${mensaje.message} (${mensaje.ruleId ?? 'eslint'})`,
  }))

const lintarCarpeta = (raiz) => ([carpeta, archivos]) => {
  ejecutar('node', [join(carpeta, PRETTIER), '--write', ...archivos], carpeta)
  const resultado = ejecutar('node', [join(carpeta, ESLINT), '-f', 'json', ...archivos], carpeta)
  const informe = leerJson(salidaDe(resultado))
  if (!informe && resultado.error) return [avisoGeneral(`ESLint no ha podido revisar:\n${textoDelFallo(resultado.error)}`)]
  return (informe ?? []).flatMap(avisosDeEslint(raiz))
}

export const revisarTypeScript = (raiz, archivos) => {
  const grupos = Object.groupBy(archivos, (ruta) => buscarHaciaArriba(dirname(ruta), raiz, hasEslint) ?? '')
  const { '': sinEslint = [], ...conEslint } = grupos
  return [
    ...Object.entries(conEslint).flatMap(lintarCarpeta(raiz)),
    ...sinEslint.map(conNombre(raiz)).flatMap(comprobarArchivo),
  ]
}

export const pythonDelProyecto = (raiz) =>
  [join(raiz, '.venv', 'Scripts', 'python.exe'), join(raiz, '.venv', 'bin', 'python')].find(existsSync)

const hasConfigDeRuff = (raiz) =>
  existsSync(join(raiz, 'ruff.toml')) ||
  (existsSync(join(raiz, 'pyproject.toml')) && readFileSync(join(raiz, 'pyproject.toml'), 'utf8').includes('[tool.ruff'))

const hasRuff = (raiz, python) =>
  Boolean(python) && hasConfigDeRuff(raiz) && !ejecutar(python, ['-m', 'ruff', '--version'], raiz).error

const avisoDeRuff = (raiz) => (fallo) => ({
  nombre: nombreEnElRepo(raiz, fallo.filename),
  desde: fallo.location?.row ?? 0,
  hasta: fallo.end_location?.row ?? fallo.location?.row ?? 0,
  texto: `${fallo.code}: ${fallo.message} (Ruff)`,
})

const avisosDeRuff = (raiz, python, archivos) => {
  ejecutar(python, ['-m', 'ruff', 'format', ...archivos], raiz)
  const resultado = ejecutar(python, ['-m', 'ruff', 'check', '--output-format', 'json', ...archivos], raiz)
  const informe = leerJson(salidaDe(resultado))
  if (!informe && resultado.error) return [avisoGeneral(`Ruff no ha podido revisar:\n${textoDelFallo(resultado.error)}`)]
  return (informe ?? []).map(avisoDeRuff(raiz))
}

// La prueba revisa todo el repo; de su salida se sacan la regla (el nombre de la prueba) y las ubicaciones.
const avisosDeLaLinea = (estado, linea) => {
  // El resumen final repite las ubicaciones bajo la última cabecera: a partir de ahí no se lee.
  if (estado.isEnElResumen || INICIO_DEL_RESUMEN.test(linea)) return { ...estado, isEnElResumen: true }
  const cabecera = linea.match(CABECERA_DE_PRUEBA)
  if (cabecera) return { ...estado, prueba: cabecera[1] }
  const avisos = [...linea.matchAll(UBICACION_EN_LA_PRUEBA)].map(([, nombre, desde, hasta]) => ({
    nombre: nombre.replaceAll('\\', '/'),
    desde: Number(desde),
    hasta: Number(hasta ?? desde),
    texto: `incumple ${estado.prueba} (tests/test_norma_estilo.py)`,
  }))
  return { ...estado, avisos: [...estado.avisos, ...avisos] }
}

const sinRepetir = (avisos) => [...new Map(avisos.map((aviso) => [JSON.stringify(aviso), aviso])).values()]

const avisosDeLaPrueba = (raiz, python) => {
  if (!existsSync(join(raiz, PRUEBA_DE_LA_NORMA))) return []
  const { error } = ejecutar(python, ['-m', 'pytest', PRUEBA_DE_LA_NORMA, ...ARGUMENTOS_DE_LA_PRUEBA], raiz)
  if (!error) return []
  // Fuera las líneas que señalan la propia prueba y el resumen final, que repite ubicaciones sin la regla.
  const lineas = textoDelFallo(error)
    .split(/\r?\n/)
    .filter((linea) => !/^(tests|FAILED|ERROR)/.test(linea.trim()))
  const { avisos } = lineas.reduce(avisosDeLaLinea, { prueba: 'la prueba de la norma', avisos: [] })
  if (avisos.length === 0) return [avisoGeneral(`La prueba de la norma falla:\n${textoDelFallo(error).slice(-1500)}`)]
  return sinRepetir(avisos)
}

export const revisarPython = (raiz, archivos) => {
  if (archivos.length === 0) return []
  const python = pythonDelProyecto(raiz)
  if (!hasRuff(raiz, python)) return archivos.map(conNombre(raiz)).flatMap(comprobarArchivo)
  return [...avisosDeRuff(raiz, python, archivos), ...avisosDeLaPrueba(raiz, python)]
}

const avisoDeRastro = (linea) => {
  const [, nombre, numero, texto] = linea.match(/^(.+?):(\d+): (\[.*)$/)
  return { nombre, desde: Number(numero), hasta: Number(numero), texto: `comentario: ${texto}` }
}

// Reutiliza el buscador de la skill limpiar-rastro-ia; sin Python, se omite sin bloquear.
export const rastrosDeIa = (raiz, archivos) => {
  const python = pythonDelProyecto(raiz) ?? 'python'
  const { valor } = ejecutar(python, [BUSCADOR_DE_RASTRO, ...archivos], raiz)
  return (valor ?? '').split(/\r?\n/).filter((linea) => /^.+?:\d+: \[/.test(linea)).map(avisoDeRastro)
}
