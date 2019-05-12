import config from '../config.js'

import nextTick from 'next-tick'
import escapeRegex from 'escape-string-regexp'

import ElementTransitionEvent from '../events/ElementTransition'

import { isFunction, isDefined } from './type-check'

import GalaxyError from '../errors/GalaxyError.js'

const same = value => value

const elementHooks = ['onCreated', 'onAttached', 'onDetached', 'onAttribute']

const HYPHEN_REGEX = /-([a-z0-9])/gi
const CAMEL_REGEX = /(?<=[a-z0-9])([A-Z])/g

const NAME_WILDCARD_DIRECTIVE = '<name>'

export function compileMatcher (name) {
  name = escapeRegex(name)
  const capture = name.replace(NAME_WILDCARD_DIRECTIVE, getWildcardCapture('[:\\w-]+'))

  return new RegExp(`^${capture === name ? getWildcardCapture(name) : capture}(?:.(?<args>.+))?$`)
}

function getWildcardCapture (name) {
  return `(?${NAME_WILDCARD_DIRECTIVE}${name})`
}

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
 * Normalize given template value
 *
 * @param {*} value
 *
 * @return {string}
 */
export function normalizeText (value) {
  return isDefined(value) ? value : ''
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

export function callHook (ce, hook, extra) {

  // Emit sync
  ce.$emit(`$${hook}`, extra)

  hook = ce[
    // Capitalize given hook name
    `on${hook.charAt(0).toUpperCase() + hook.slice(1)}`
  ]

  if (isFunction(hook)) {

    // Emit async
    nextTick.afterFlush(() => {
      hook.call(ce, extra)
    })
  }
}

export function ensureListeners (events, event) {
  return events[event] || []
}

export function removeListener (events, event, listener) {
  const alive = ensureListeners(events, event).filter(_ => _ !== listener)

  if (alive.length) {
    events[event] = alive
  } else {
    delete events[event]
  }
}

export function applyMixins (Class, mixins) {
  return Object.assign(Class.prototype, ...mixins)
}

export function mergeEventHandlers (handlers) {
  return (...args) => {
    let i = 0

    const next = (...args) => {
      const current = handlers[i++]

      if (current) {
        current(next, ...args)
      }
    }

    next(...args)
  }
}

export function dispatchTransitionEvent (source, type, target, transitionCb) {
  const transitionEvent = new ElementTransitionEvent(type, {
    target,
    transitionCb
  })

  source.dispatchEvent(transitionEvent)

  // Perform transition (waiting for non-stopped transition)
  transitionEvent.perform()
}

export function applyStateMixins (state, mixins) {
  for (let mixinState of mixins) {
    // Get fresh state object
    mixinState = mixinState()

    for (const key of Object.keys(mixinState)) {
      if (!(key in state)) {
        mixDescriptor(state, mixinState, key)
      }
    }
  }
}

export function applyUserMixins (GalaxyElement, mixins) {
  const { prototype: fn } = GalaxyElement
  const stateMixins = GalaxyElement.$stateMixins = []

  for (const mixin of mixins) {
    for (const key of Object.keys(mixin)) {
      if (isHook(key)) {
        const prevHook = fn[key]
        const nextHook = mixin[key]

        fn[key] = function mixedHook () {
          prevHook.call(this)
          nextHook.call(this)
        }
      } else if (key === 'state') {
        const mixinState = mixin[key]

        if (typeof mixinState !== 'function') {
          throw new GalaxyError('mixin `state` property must be a function that returns a fresh state object')
        }

        stateMixins.push(mixinState)
      } else if (!(key in fn)) {
        mixDescriptor(fn, mixin, key)
      }
    }
  }
}

/**
 * Mix property value using descriptors to support getters/setters
 *
 * @param {Object} target
 * @param {Object} source
 * @param {string} key
 *
 * @return void
 */
function mixDescriptor (target, source, key) {
  Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key))
}

function isHook (name) {
  return elementHooks.some(hook => hook === name)
}
