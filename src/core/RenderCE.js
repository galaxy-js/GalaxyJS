import { registry } from '../registry.js'

import AbstractRender from './AbstractRender.js'

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
    const name = element.constructor.is
    return name && registry.has(name)
  }

  _resolveProps () {
    const { props } = this.element

    for (const binding of this.bindings) {
      const prop = (binding.node || binding.attribute).name

      if (props.hasOwnProperty(prop)) {

        // Immutable property
        Object.defineProperty(props, prop, {
          enumerable: true,
          get () {

            // Get raw value (with references)
            return binding.value
          }
        })

        // Don't reflect prop value
        // TODO: May stay in debug?
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
