// Único sitio de los hooks que recoge errores (regla 17 de la norma).
// El resto decide con una guarda: const { valor, error } = intentar(() => …); if (error) return …
export const intentar = (funcion) => {
  try {
    return { valor: funcion(), error: null }
  } catch (fallo) {
    return { valor: null, error: fallo }
  }
}
