export function isObject (value) {
  return value !== null && typeof value === 'object'
}

export function isProxy (value) {
  return value instanceof Proxy
}
