import ElementRenderer from './Element.js'

import { compileScopedGetter } from '../../compiler/index.js'
import { camelize } from '../../utils/generic.js'
import { isGalaxyElement } from '../../utils/type-check.js'

const PROP_TOKEN = '.'

/**
 * Renderer for custom elements (resolve props)
 */
export default class CustomRenderer extends ElementRenderer {
  constructor (ce, scope, isolated) {
    super(ce, scope, isolated)

    // Set parent communication
    ce.$parent = this.scope

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
    // Resolve element bindings
    super.render()

    if (this.element.isConnected) {

      // Re-render (digest props)
      this.element.$render()
    }
  }
}
