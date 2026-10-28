import { execFileSync } from 'node:child_process'
import { intentar } from './intentar.mjs'

const MAX_ESPERA_POR_HERRAMIENTA_MS = 60_000

// Devuelve { valor, error } como intentar(): valor es la salida; error, el fallo con su stdout y stderr.
export const ejecutar = (programa, argumentos, carpeta) =>
  intentar(() =>
    execFileSync(programa, argumentos, {
      cwd: carpeta,
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: MAX_ESPERA_POR_HERRAMIENTA_MS,
      // Sin esto, Python en Windows escribe en cp1252 y las tildes llegan rotas.
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    })
  )

// Los linters salen con error cuando encuentran algo: su informe viene igualmente en stdout.
export const salidaDe = ({ valor, error }) => valor ?? error?.stdout ?? ''

export const textoDelFallo = (error) => `${error.stdout ?? ''}${error.stderr ?? ''}`.trim() || error.message
