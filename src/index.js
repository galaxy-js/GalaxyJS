import config from './config.js'

import { extend } from './core/GalaxyElement.js'

import GalaxyError, { galaxyError } from './errors/GalaxyError.js'

import { compileMatcher, applyUserMixins } from './utils/generic.js'

/**
 * Directives
 */
import ConditionalDirective from './directives/Conditional.js'
import ShowDirective from './directives/Show'
import EventDirective from './directives/Event.js'
import PropertyDirective from './directives/Property.js'
import ReferenceDirective from './directives/Reference.js'
import ClassDirective from './directives/binding/Class.js'
import StyleDirective from './directives/binding/Style.js'
import BindingDirective from './directives/binding/Binding.js'
import CheckboxDirective from './directives/model/Checkbox.js'
import RadioDirective from './directives/model/Radio.js'
import InputDirective from './directives/model/Input.js'
import SelectDirective from './directives/model/Select.js'

export { default as GalaxyDirective } from './core/GalaxyDirective.js'
export { default as GalaxyPlugin, withCachedInstance } from './core/GalaxyPlugin.js'
export { config, extend }

export const GalaxyElement = extend(HTMLElement)

/**
 * Generates a new template
 *
 * @param {*...} args
 *
 * @return {HTMLTemplateElement}
 */
export function html (...args) {
  return template('template', ...args)
}

/**
 * Generates a new style template
 *
 * @param {*...} args
 *
 * @return {HTMLStyleElement}
 */
export function css (...args) {
  const style = template('style', ...args)

  // Avoid construction phase
  style.setAttribute('skip', '')

  return style
}

/**
 * Initialize galaxy
 *
 * @param {Object} options
 *
 * @return void
 */
export function setup (options) {

  // Merge rest options with default configuration
  Object.assign(config, options)

  if (config.plugins) {
    for (const GalaxyPlugin of config.plugins) {

      // Perform plugin initialization
      GalaxyPlugin.init(config)
    }
  }

  // Add core directives
  config.directives.unshift(...[
    ConditionalDirective,
    ShowDirective,
    EventDirective,
    PropertyDirective,
    ReferenceDirective,

    // Bindings
    ClassDirective,
    StyleDirective,
    BindingDirective,

    // Model
    CheckboxDirective,
    RadioDirective,
    InputDirective,
    SelectDirective
  ])

  // Compile matchers
  for (const Directive of config.directives) {
    Directive._matcher = compileMatcher(Directive.is)
  }

  if (!config.root) {
    throw new GalaxyError('You must include a `root` option')
  }

  // Register root element + additional elements
  resolveElements([config.root, ...config.elements], config)
}

/**
 * Generates a new html element
 *
 * @param {string} tag
 * @param {*...} args
 *
 * @return {HTMLElement}
 * @private
 */
function template (tag, ...args) {
  const element = document.createElement(tag)

  element.innerHTML = String.raw(...args)

  return element
}

/**
 * Register GalaxyElements recursively.
 * Also perform plugin installation
 *
 * @param {Array<GalaxyElement>} elements
 * @param {Array<GalaxyPlugin>} plugins
 *
 * @return void
 * @private
 */
async function resolveElements (elements, config) {
  const promises = []

  for (const GalaxyElement of elements) {
    // Skip resolved elements
    if (GalaxyElement.__resolved__) continue

    const elementOptions = {}
    const name = GalaxyElement.is

    if (!name) {
      throw new GalaxyError('Unknown element tag name')
    }

    if (GalaxyElement.extendsBuiltIn && !(elementOptions.extends = GalaxyElement.extends)) {
      throw new GalaxyError('Extended customized built-in elements must have an `extends` property')
    }

    // Install plugins before resolving
    installPlugins(GalaxyElement, config.plugins)

    // Apply user-defined mixins
    applyUserMixins(GalaxyElement, [...config.mixins, ...GalaxyElement.mixins])

    // Mark element as resolved
    GalaxyElement.__resolved__ = true

    // Resolve inner elements before resolve the wrapper element
    await resolveElements(GalaxyElement.children, config)

    try {
      customElements.define(name, GalaxyElement, elementOptions)
      promises.push(customElements.whenDefined(name))
    } catch (error) {
      throw galaxyError(error)
    }
  }

  await Promise.all(promises)
}

/**
 * Perform plugins installation
 *
 * @param {GalaxyElement} GalaxyElement
 * @param {Array<GalaxyPlugin>} plugins
 *
 * @return void
 */
function installPlugins (GalaxyElement, plugins) {
  for (const GalaxyPlugin of plugins) {
    GalaxyPlugin.install(GalaxyElement)
  }
}
