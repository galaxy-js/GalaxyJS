import config from '../config.js'

const same = value => value

export function camelize (string) {
  return string.replace(/-([a-z])/, (_, letter) => letter.toUpperCase())
}

export function digestData (element, name, conversor = same) {
  const value = conversor(element.getAttribute(name))

  if (!config.debug) element.removeAttribute(name)

  return value
}
