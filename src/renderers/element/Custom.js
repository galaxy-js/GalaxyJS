import BaseRenderer from './Base.js'

import { compileScopedGetter } from '../../compiler/index.js'
import { camelize } from '../../utils/generic.js'
import { isGalaxyElement } from '../../utils/type-check.js'

const PROP_TOKEN = '.'

/**
 * Renderer for custom elements resolving props
 */
export default class CustomRenderer extends BaseRenderer {
  constructor (...args) {
    super(...args)

    this._resolveProps()
  }

  static is (element) {
    return isGalaxyElement(element)
  }

  _resolveProps () {
    const { props, attributes } = this.element

    for (const { name, value } of Array.from(attributes)) {
      if (name.startsWith(PROP_TOKEN)) {

        // Normalize prop name
        const prop = camelize(name.slice(1))

        if (props.hasOwnProperty(prop)) {

          // Get raw value (with references)
          const get = compileScopedGetter(value, this)

          // Immutable property
          Object.defineProperty(props, prop, { enumerable: true, get })
        }

        // TODO: Warn unknown prop

        // Don't reflect prop value
        this.element.removeAttribute(name)
      }
    }
  }

  render () {
    // Resolve directive, props & attribute bindings
    super.render()

    // Re-render (digest props)
    this.element.$render()
  }
}
