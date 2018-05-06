import config from '../config.js'

import nextTick from 'https://cdn.jsdelivr.net/gh/LosMaquios/next-tick@v0.1.0/index.js'

import { isObject, isFunction } from './type-check.js'

const same = value => value

const HYPEN_REGEX = /-([a-z][0-9])/gi

/**
 * Converts hypenated string to camelized
 *
 * @param {string} hypenated
 *
 * @return {string}
 */
export function camelize (hypenated) {
  return hypenated.replace(HYPEN_REGEX, (_, letter) => letter.toUpperCase())
}

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
 * @param {ElementRenderer} element
 *
 * @return {Array.<*>}
 */
export function flatChildren (element) {
  const flat = []

  element.children.forEach(child => {
    flat.push(...(child.isFlatteable ? flatChildren(child) : [child]))
  })

  return flat
}

export function callHook (ce, hook, ...args) {
  hook = ce[
    // Capitalize given hook name
    `on${hook.charAt(0).toUpperCase() + hook.slice(1)}`
  ]

  if (isFunction(hook)) {
    nextTick.afterFlush(() => {
      hook.call(ce, ...args)
    })
  }
}

export function ensureListeners (events, event) {
  return events[event] || []
}
