import config from './config.js'

import Element from './Element.js'

export function html (...args) {
  const template = document.createElement('template')

  template.innerHTML = String.raw(...args)

  return template
}

const Galaxy = {}

// Setup configuration
Galaxy.config = config

Galaxy.Element = Element

Galaxy.register = async CustomElement => {
  if (typeof CustomElement.is === 'undefined') {
    throw new GalaxyError('Unknown element name')
  }

  try {
    customElements.define(CustomElement.is, CustomElement)
  } catch (e) {
    throw new GalaxyError(e.message)
  }

  // Await CE definition
  await customElements.whenDefined(CustomElement.is)

  return CustomElement
}

export default Galaxy
