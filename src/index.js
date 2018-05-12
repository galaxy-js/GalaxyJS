import config from './config.js'

export { config }
export { default as GalaxyElement } from './core/GalaxyElement.js'

export function html (...args) {
  const template = document.createElement('template')

  template.innerHTML = String.raw(...args)

  return template
}

export function setup (options) {
  options = Object.assign({}, options)

  // Merge rest options with default configuration
  Object.assign(config, options)

  // Register element classes
  for (const GalaxyElement of options.elements) {
    if (typeof GalaxyElement.is === 'undefined') {
      throw new GalaxyError('Unknown element name')
    }

    try {
      customElements.define(GalaxyElement.is, GalaxyElement)
    } catch (e) {
      throw new GalaxyError(e.message)
    }
  }
}
