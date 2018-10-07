import GalaxyDirective from '../core/GalaxyDirective.js'

import { isGalaxyElement } from '../utils/type-check.js'

export default class PropertyDirective extends GalaxyDirective {
  static get is () {
    return '.<name>'
  }

  init () {
    this._inCustom = isGalaxyElement(this.$element)

    // Init with default value
    this.$element[this.$name] = null
  }

  render () {
    this.$element[this.$name] = this.$getter()

    if (this._inCustom) {
      this.$element.$render()
    }
  }
}
