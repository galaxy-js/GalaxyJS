import config from './config.js'

import GalaxyError, { galaxyError } from './errors/GalaxyError.js'

import { hyphenate } from './utils/generic.js'

export { config }
export { default as GalaxyElement } from './core/GalaxyElement.js'

export function html (...args) {
  const template = document.createElement('template')

  template.innerHTML = String.raw(...args)

  return template
}

export function setup (options) {

  // Merge rest options with default configuration
  Object.assign(config, options)

  // Register element classes
  for (const GalaxyElement of options.elements) {
    const name = GalaxyElement.is || GalaxyElement.name && hyphenate(GalaxyElement.name)

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
