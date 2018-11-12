import GalaxyDirective from '../core/GalaxyDirective.js'

import { createAnchor } from '../utils/generic.js'

export default class ConditionalDirective extends GalaxyDirective {
  static get is () {
    return '*if'
  }

  init () {
    this.anchor = createAnchor(`if: ${this.$value}`)
  }

  render () {
    // TODO: Add hooks for future transitions

    const { isConnected } = this.$element

    if (this.$getter()) {
      !isConnected && this.anchor.replaceWith(this.$element)
    } else if (isConnected) {
      this.$element.replaceWith(this.anchor)
    }
  }
}
