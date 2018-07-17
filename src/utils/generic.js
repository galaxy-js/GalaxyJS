import config from '../config.js'

import nextTick from 'next-tick'

import { isFunction } from './type-check.js'

const same = value => value

const HYPHEN_REGEX = /-([a-z0-9])/gi
const CAMEL_REGEX = /(?<=[a-z0-9])([A-Z])/g

/**
 * Converts hyphenated string to camelized
 *
 * @param {string} hyphenated
 *
 * @return {string}
 */
export function camelize (hyphenated) {
  return hyphenated.replace(HYPHEN_REGEX, (_, letter) => letter.toUpperCase())
}

/**
 * Converts camelized string to hyphenated
 *
 * @param {string} camelized
 *
 * @return {string}
 */
export function hyphenate (camelized) {
  return camelized.replace(CAMEL_REGEX, (_, letter) => `-${letter.toLowerCase()}`)
    // Make rest letters lowercased
    .toLowerCase()
}

export function getAttr (element, name, conversor = same) {
  const value = conversor(element.getAttribute(name))

  if (!config.debug) element.removeAttribute(name)

  return value
}

export function createAnchor (content) {
  return config.debug ? new Comment(` ${content} `) : new Text()
}

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

  element.childrenRenderer.renderers.forEach(renderer => {
    flat.push(...(renderer.isFlattenable ? flatChildren(renderer) : [renderer]))
  })

  return flat
}

export function getName (GalaxyElement) {
  return GalaxyElement.is || GalaxyElement.name && hyphenate(GalaxyElement.name)
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

export function applyMixins (Class, mixins) {
  return Object.assign(Class.prototype, ...mixins)
}
