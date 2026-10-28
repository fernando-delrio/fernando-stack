// Hook Stop de fernando-stack. Al terminar un turno con cambios de código, revisa solo las líneas
// que han cambiado (un archivo nuevo, entero), para no obligar a rehacer código antiguo tocado de paso.
//   - Repo con la norma (tiene sus plantillas): formateador, linter y prueba de la norma; lo que
//     falle vuelve a Claude para que lo corrija, como mucho MAX_INTENTOS veces, y luego avisa y para.
//   - Repo sin la norma: comprobador ligero, sin formatear nada; solo avisa a Fernando, nunca bloquea.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { extname, join } from 'node:path'
import { comprobarArchivo } from './comprobador-ligero.mjs'
import { comprobarExcepciones } from './excepciones.mjs'
import { archivosCambiados, EXTENSIONES_PY, EXTENSIONES_TS, lineasCambiadas, raizDelRepo, TODAS_LAS_LINEAS } from './git.mjs'
import { conNombre, nombreEnElRepo, PRUEBA_DE_LA_NORMA, rastrosDeIa, revisarPython, revisarTypeScript } from './herramientas.mjs'
import { intentar } from './intentar.mjs'

// Claude Code solo corta un Stop hook tras 8 bloqueos seguidos sin herramientas entre medias; como
// corregir usa herramientas, ese tope no para nunca este hook y hace falta uno propio.
const MAX_INTENTOS = 2
const MAX_AVISOS_EN_EL_MENSAJE = 40
// Claude Code recorta a 10 000 caracteres lo que devuelve un hook.
const MAX_CARACTERES = 9_000
const MARCA_DE_LA_NORMA = /fernando-stack|ESTILO_CODIGO_FERNANDO/
const ARCHIVOS_QUE_MARCAN_LA_NORMA = ['ruff.toml', 'eslint.config.js', join('frontend', 'eslint.config.js')]
const COMO_EXCEPCION =
  'Si una regla empeora la lectura: `// eslint-disable-next-line <regla> -- <porqué>` o `# norma: permitir <regla> -- <porqué>`. ' +
  'else, ternarios, switch/match, try fuera de intentar, function y export default no admiten excepción.'

const leerEntrada = async () => Buffer.concat(await Array.fromAsync(process.stdin)).toString('utf8')

const huellaDe = (texto) => createHash('sha1').update(texto).digest('hex')

const archivoTemporal = (tipo, clave) => join(tmpdir(), `fernando-stack-${tipo}-${huellaDe(String(clave)).slice(0, 12)}.txt`)

const leerSiExiste = (ruta) => existsSync(ruta) && readFileSync(ruta, 'utf8')

const huellaDeLosCambios = (archivos) =>
  huellaDe(archivos.map((ruta) => `${ruta}\n${readFileSync(ruta, 'utf8')}`).join('\n'))

const isYaRevisado = (raiz, huella) => leerSiExiste(archivoTemporal('cierre', raiz)) === huella

const intentosHechos = (sesion) => Number(leerSiExiste(archivoTemporal('intentos', sesion)) || 0)

// stop_hook_active indica que este turno ya lo alargó un Stop hook: se siguen contando los intentos.
const intentosDelTurno = (entrada, sesion) => {
  if (!entrada.stop_hook_active) return 0
  return intentosHechos(sesion)
}

const mencionaLaNorma = (raiz) => (archivo) =>
  MARCA_DE_LA_NORMA.test(leerSiExiste(join(raiz, archivo)) || '')

export const isRepoConLaNorma = (raiz) =>
  existsSync(join(raiz, PRUEBA_DE_LA_NORMA)) || ARCHIVOS_QUE_MARCAN_LA_NORMA.some(mencionaLaNorma(raiz))

const esDe = (extensiones) => (ruta) => extensiones.has(extname(ruta))

const revisarConLaNorma = (raiz, archivos) => [
  ...revisarTypeScript(raiz, archivos.filter(esDe(EXTENSIONES_TS))),
  ...revisarPython(raiz, archivos.filter(esDe(EXTENSIONES_PY))),
]

const revisar = (raiz, archivos, isConLaNorma) => {
  const comunes = [...archivos.map(conNombre(raiz)).flatMap(comprobarExcepciones), ...rastrosDeIa(raiz, archivos)]
  if (isConLaNorma) return [...comunes, ...revisarConLaNorma(raiz, archivos)]
  return [...comunes, ...archivos.map(conNombre(raiz)).flatMap(comprobarArchivo)]
}

const isEnLasLineas = (rangos) => (aviso) =>
  aviso.isGeneral ||
  rangos === TODAS_LAS_LINEAS ||
  rangos.some(([desde, hasta]) => aviso.desde <= hasta && aviso.hasta >= desde)

const rangosPorArchivo = (raiz, archivos) =>
  new Map(archivos.map((ruta) => [nombreEnElRepo(raiz, ruta), lineasCambiadas(raiz, ruta)]))

// Solo cuenta lo que toca una línea cambiada de un archivo cambiado; el resto es código antiguo.
const soloLoCambiado = (avisos, rangos) =>
  avisos.filter((aviso) => aviso.isGeneral || (rangos.has(aviso.nombre) && isEnLasLineas(rangos.get(aviso.nombre))(aviso)))

const lineaDelAviso = ({ nombre, desde, texto, isGeneral }) => {
  if (isGeneral) return texto
  return `${nombre}:${desde}: ${texto}`
}

const listaDeAvisos = (avisos) => {
  const lineas = avisos.slice(0, MAX_AVISOS_EN_EL_MENSAJE).map(lineaDelAviso)
  const resto = avisos.length - lineas.length
  return [...lineas, resto > 0 && `… y ${resto} más`].filter(Boolean).join('\n').slice(0, MAX_CARACTERES)
}

const responder = (salida) => process.stdout.write(JSON.stringify(salida))

const guardar = (tipo, clave, contenido) => writeFileSync(archivoTemporal(tipo, clave), String(contenido))

const olvidarIntentos = (sesion) => rmSync(archivoTemporal('intentos', sesion), { force: true })

const devolverAClaude = ({ avisos, intentos, sesion }) => {
  guardar('intentos', sesion, intentos + 1)
  responder({
    systemMessage: `Norma de estilo: ${avisos.length} avisos en lo cambiado; Claude los corrige (intento ${intentos + 1} de ${MAX_INTENTOS}).`,
    hookSpecificOutput: {
      hookEventName: 'Stop',
      additionalContext: `La norma de estilo (fernando-stack) encuentra esto en las líneas que has cambiado. Corrígelo antes de terminar. ${COMO_EXCEPCION}\n\n${listaDeAvisos(avisos)}`,
    },
  })
}

const rendirseYAvisar = ({ avisos, sesion }) => {
  olvidarIntentos(sesion)
  responder({
    systemMessage: `Norma de estilo: tras ${MAX_INTENTOS} intentos quedan ${avisos.length} avisos sin corregir en lo cambiado. Claude ha parado; revísalos:\n${listaDeAvisos(avisos)}`,
  })
}

const soloAvisar = ({ avisos }) =>
  responder({ systemMessage: `Norma de estilo (repo sin la norma, solo aviso): ${avisos.length} avisos en lo cambiado:\n${listaDeAvisos(avisos)}` })

const decidir = (situacion) => {
  const { avisos, isConLaNorma, intentos, sesion, raiz, huella } = situacion
  if (avisos.length === 0) return olvidarIntentos(sesion)
  if (!isConLaNorma) return soloAvisar(situacion)
  if (intentos < MAX_INTENTOS) return devolverAClaude(situacion)
  // Lo abandonado no se vuelve a intentar hasta que cambien los archivos.
  guardar('cierre', raiz, huella)
  rendirseYAvisar(situacion)
}

const comprobarCierre = async () => {
  const { valor: entrada } = intentar(JSON.parse.bind(null, await leerEntrada()))
  const raiz = entrada && raizDelRepo(entrada.cwd ?? process.cwd())
  if (!raiz) return
  const archivos = archivosCambiados(raiz)
  const huella = huellaDeLosCambios(archivos)
  if (archivos.length === 0 || isYaRevisado(raiz, huella)) return
  const isConLaNorma = isRepoConLaNorma(raiz)
  const avisos = soloLoCambiado(revisar(raiz, archivos, isConLaNorma), rangosPorArchivo(raiz, archivos))
  const sesion = entrada.session_id ?? raiz
  const intentos = intentosDelTurno(entrada, sesion)
  // En verde, o ya avisado en un repo sin la norma: no se repite hasta que cambien los archivos.
  const isRevisionCerrada = avisos.length === 0 || !isConLaNorma
  if (isRevisionCerrada) guardar('cierre', raiz, huella)
  decidir({ avisos, isConLaNorma, intentos, sesion, raiz, huella })
}

comprobarCierre()
