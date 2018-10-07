import config from '../../config.js'
import GalaxyDirective from '../../core/GalaxyDirective.js'

import { differ } from '../../utils/generic.js'

/**
 * Directive for bindings:
 *
 *   1. :attribute
 *   2. ::attribute (one time)
 */
export default class BindingDirective extends GalaxyDirective {
  static get is () {
    return ':<name>'
  }

  _getObserved () {
    let observed = this.$element.getAttributeNode(this.$name)

    if (!config.debug) this.$element.removeAttribute(this.$name)

    if (!observed) {
      observed = document.createAttribute(this.$name)
      this.$element.setAttributeNode(observed)
    }

    return observed
  }

  init () {
    this.attribute = this._getObserved()
  }

  render () {
    const value = this.$getter()

    if (typeof value === 'boolean') {
      this.element[`${value ? 'set' : 'remove'}AttributeNode`](this.attribute)
    } else if (differ(this.attribute, value)) {
      this.attribute.value = value
    }
  }
}
