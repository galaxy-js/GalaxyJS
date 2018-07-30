import ElementRenderer from './Element.js'
import VoidRenderer from './Void.js'

import { compileScopedGetter } from '../../compiler/index.js'
import { camelize, getAttr } from '../../utils/generic.js'

const PROP_TOKEN = '.'

export const CustomRenderer = generateCustom(ElementRenderer)
export const CustomVoidRenderer = generateCustom(VoidRenderer)

function generateCustom (SuperRenderer) {

  /**
   * Renderer for custom elements (resolve props)
   */
  return class CustomRenderer extends SuperRenderer {
    constructor (ce, scope, isolated) {
      super(ce, scope, isolated)

      this.properties = {}

      this._resolveProps(ce)
    }

    _resolveProps ($el) {
      const { constructor, attributes } = $el
      const { properties } = constructor

      for (const { name } of Array.from(attributes)) {
        if (name.startsWith(PROP_TOKEN)) {

          // Normalize prop name
          const property = camelize(name.slice(1 /* skip `.` */))

          if (properties.hasOwnProperty(property)) {

            // Set initial property value
            $el[property] = properties[property]

            // Add property to update
            this.properties[property] = compileScopedGetter(getAttr($el, name))
          }

          // TODO: Detect valid prop names (stuff like innerHTML, textContent, etc)
          // TODO: Warn unknown prop
        }
      }
    }

    render () {
      // Resolve element bindings
      super.render()

      // Resolve property values
      for (const property in this.properties) {

        // Set raw value with references
        this.element[property] = this.properties[property](this.scope, this.isolated)
      }

      if (this.element.isConnected) {

        // Re-render (digest props)
        this.element.$render()
      }
    }
  }
}
