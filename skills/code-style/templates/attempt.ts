// The only place in the frontend that catches errors (rule 17 of the readfirst style rules).
// The rest of the code receives { value, error } and decides with a guard: if (error) return …

export type Outcome<Value> = { value: Value; error: null } | { value: null; error: Error }

const toError = (failure: unknown) => {
  if (failure instanceof Error) return failure
  return new Error(String(failure))
}

export const attempt = <Value>(promise: Promise<Value>): Promise<Outcome<Value>> =>
  promise.then(
    (value) => ({ value, error: null }),
    (failure: unknown) => ({ value: null, error: toError(failure) })
  )

// For what can fail without being async: reading sessionStorage or parsing JSON.
export const attemptSync = <Value>(callback: () => Value): Outcome<Value> => {
  try {
    return { value: callback(), error: null }
  } catch (failure) {
    return { value: null, error: toError(failure) }
  }
}
