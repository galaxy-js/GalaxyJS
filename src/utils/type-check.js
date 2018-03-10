export function isObject (value) {
  return value !== null && typeof value === 'object'
}

export function isTextNode (node) {
  return node.nodeType === Node.TEXT_NODE
}

export function isElementNode (node) {
  return node.nodeType === Node.ELEMENT_NODE
}

export function hasTemplate (node) {
  return node.nodeValue.indexOf('{{') > -1
}
