import GalaxyError from '../errors/GalaxyError.js'

import ChildrenRenderer from '../renderers/element/Children.js'

/**
 * Setup GalaxyElement's main renderer
 *
 * @param {GalaxyElement} $element
 */
export function setupRenderer ($element) {
  let shadow

  const { style, template } = $element.constructor

  try {
    shadow = $element.attachShadow({ mode: 'open' })
  } catch (e) {
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow#Exceptions
     */
  }

  if (style instanceof HTMLStyleElement) {
    if (!shadow) throw new GalaxyError('style cannot be attached')

    shadow.appendChild(style.cloneNode(true))
  }

  if (template instanceof HTMLTemplateElement) {
    if (!shadow) throw new GalaxyError('template cannot be attached')

    shadow.appendChild(template.content.cloneNode(true))
  }

  return new ChildrenRenderer(shadow ? shadow.childNodes : [], $element, {})
}
