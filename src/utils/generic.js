import config from '../config.js'
import { isObject } from './type-check.js'

const same = value => value

export function digestData (element, name, conversor = same) {
  const value = conversor(element.getAttribute(name))

  if (!config.debug) element.removeAttribute(name)

  return value
}

export function toString (value) {
  return isObject(value) ? JSON.stringify(value) : String(value)
}

export const createAnchor = config.debug
  ? content => new Comment(` ${content} `)
  : () => new Text() // Empty text node

export function diff ({ nodeValue }, newValue) {
  return nodeValue !== newValue
}

/**
 * Creates a new child isolated
 *
 * @param {*} parents - Parents to inherit from
 *
 * @return {Object}
 */
export function newIsolated (...parents) {
  return Object.assign(Object.create(null), ...parents)
}

/**
 * Check if the value of a given `node`
 * differs againts the given `value`
 *
 * @param {Node} node - Node element to check
 * @param {*} value - Value to compare with
 *
 * @return {boolean}
 */
export function differ (node, value) {
  return node.nodeValue !== value
}

/**
 * Flat children from a given `element`
 *
 * @param {RenderElement} element
 *
 * @return {Array.<RenderElement|RenderTemplate|RenderHTML|RenderGalaxy>}
 */
export function flatChildren (element) {
  const flat = []

  element.children.forEach(child => {
    flat.push(...(child.isFlatteable ? flatChildren(child) : [child]))
  })

  return flat
}
