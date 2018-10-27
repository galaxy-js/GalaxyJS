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

    const { parentNode } = this.$element

    if (this.$getter()) {
      !parentNode && this.anchor.replaceWith(this.$element)
    } else if (parentNode) {
      this.$element.replaceWith(this.anchor)
    }
  }
}
