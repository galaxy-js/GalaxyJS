import config from '../config.js'
import { isObject } from './type-check.js'

const same = value => value

export function camelize (string) {
  return string.replace(/-([a-z])/, (_, letter) => letter.toUpperCase())
}

export function digestData (element, name, conversor = same) {
  const value = conversor(element.getAttribute(name))

  if (!config.debug) element.removeAttribute(name)

  return value
}

export function toString (value) {
  return isObject(value) ? JSON.stringify(value) : String(value)
}
