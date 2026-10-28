// Único sitio del frontend que recoge errores (regla 17 de la norma de estilo de fernando-stack).
// El resto del código recibe { valor, error } y decide con una guarda: if (error) return …

export type Resultado<Valor> = { valor: Valor; error: null } | { valor: null; error: Error }

const comoError = (fallo: unknown) => {
  if (fallo instanceof Error) return fallo
  return new Error(String(fallo))
}

export const intentar = <Valor>(promesa: Promise<Valor>): Promise<Resultado<Valor>> =>
  promesa.then(
    (valor) => ({ valor, error: null }),
    (fallo: unknown) => ({ valor: null, error: comoError(fallo) })
  )

// Para lo que puede fallar sin ser asíncrono: leer sessionStorage o interpretar JSON.
export const intentarSinEsperar = <Valor>(funcion: () => Valor): Resultado<Valor> => {
  try {
    return { valor: funcion(), error: null }
  } catch (fallo) {
    return { valor: null, error: comoError(fallo) }
  }
}
