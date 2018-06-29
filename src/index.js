import config from './config.js'

import GalaxyError, { galaxyError } from './errors/GalaxyError.js'

import { getName } from './utils/generic.js'

export { config }
export { default as GalaxyElement } from './core/GalaxyElement.js'

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

  // Register element classes
  for (const GalaxyElement of options.elements) {
    const name = getName(GalaxyElement)

    if (!name) {
      throw new GalaxyError('Unknown element tag name')
    }

    try {
      customElements.define(name, GalaxyElement)
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
