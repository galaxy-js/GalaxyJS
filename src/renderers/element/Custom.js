import ElementRenderer from './Element.js'

import { compileScopedGetter } from '../../compiler/index.js'
import { camelize, getName, getAttr } from '../../utils/generic.js'
import { isGalaxyElement } from '../../utils/type-check.js'

const PROP_TOKEN = '.'

/**
 * Renderer for custom elements (resolve props)
 */
export default class CustomRenderer extends ElementRenderer {
  constructor (ce, scope, isolated) {
    super(ce, scope, isolated)

    // Set parent communication
    ce.$parent = scope

    // Set children communication
    scope.$children[camelize(getName(ce.constructor))] = ce

    this.properties = []

    this._resolveProps(ce)
  }

  static is (element) {
    return isGalaxyElement(element)
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

          // Push property to update
          this.properties.push({
            property,

            // Get raw value (with references)
            getter: compileScopedGetter(getAttr($el, name))
          })
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
    for (const { property, getter } of this.properties) {
      this.element[property] = getter(this.scope, this.isolated)
    }

    if (this.element.isConnected) {

      // Re-render (digest props)
      this.element.$render()
    }
  }
}
