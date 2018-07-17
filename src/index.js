import config from './config.js'

import { extend } from './core/GalaxyElement.js'

import EventsMixin from './core/mixins/Events.js'
import ObserveMixin from './core/mixins/Observe.js'

import GalaxyError, { galaxyError } from './errors/GalaxyError.js'

import { getName, applyMixins } from './utils/generic.js'

export { extend, config }

export const GalaxyElement = extend(HTMLElement)

// Mix features
applyMixins(GalaxyElement, [
  EventsMixin,
  ObserveMixin
])

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

  if ('plugins' in options) {
    installPlugins(options.plugins)
  }

  // Register element classes
  for (const GalaxyElement of options.elements) {
    let defineOptions = {}
    const name = getName(GalaxyElement)

    if (!name) {
      throw new GalaxyError('Unknown element tag name')
    }

    if (GalaxyElement.extendsBuiltIn && !(defineOptions.extends = GalaxyElement.extends)) {
      throw new GalaxyError('Extended customized built-in elements must have an `extends` property')
    }

    try {
      customElements.define(name, GalaxyElement, defineOptions)
    } catch (e) {
      throw galaxyError(e)
    }
  }
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
 * Perform plugins installation
 *
 * @param {Array<Object|Function>} plugins
 *
 * @return void
 */
function installPlugins (plugins) {
  const install = Object.assign.bind(null, GalaxyElement.prototype)

  for (const pluginName in plugins) {
    const plugin = plugins[pluginName]

    if (plugin !== null && typeof plugin === 'object') {
      install(plugin)
    } else if (typeof plugin === 'function') {
      plugin(GalaxyElement)
    } else {
      throw new GalaxyError(`plugin '${pluginName}' must be an object or function`)
    }
  }
}
