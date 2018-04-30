import AbstractRender from './AbstractRender.js'

import { compileScopedGetter } from '../compiler/index.js'
import { camelize } from '../utils/generic.js'

import { ELEMENT_SYMBOL } from '../symbols.js'

const PROP_TOKEN = '.'

/**
 * Simple wrapper to handle
 * Galaxy elements digest cycle
 */
export default class RenderCE extends AbstractRender {
  constructor (...args) {
    super(...args)

    this._resolveProps()
  }

  static is (element) {
    return element.hasOwnProperty(ELEMENT_SYMBOL)
  }

  _resolveProps () {
    const { props, attributes } = this.element

    for (const { name, value } of attributes) {
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
        this.element.removeAttribute(prop)
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
