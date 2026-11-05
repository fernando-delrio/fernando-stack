// The only place in the hooks that catches errors (rule 17 of the style rules).
// Everything else decides with a guard: const { value, error } = attempt(() => …); if (error) return …
export const attempt = (callback) => {
  try {
    return { value: callback(), error: null }
  } catch (failure) {
    return { value: null, error: failure }
  }
}
