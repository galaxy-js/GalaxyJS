export { Element } from './Element.js'

export function html (...args) {
  const template = document.createElement('template')

  template.innerHTML = String.raw(...args)

  return template
}

export async function register (...elements) {
  for (const GalaxyElement of elements) {
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
