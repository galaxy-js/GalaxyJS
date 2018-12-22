export function isObject (value) {
  return value !== null && typeof value === 'object'
}

export function isTextNode (node) {
  return node.nodeType === Node.TEXT_NODE
}

export function isElementNode (node) {
  return node.nodeType === Node.ELEMENT_NODE
}

export function isFunction (value) {
  return typeof value === 'function'
}

export function isDefined (value) {
  return value != null
}

export function isReserved (name) {
  return name.startsWith('$') || name.startsWith('_')
}

export function isGalaxyElement (element) {
  return !!element.$galaxy
}
