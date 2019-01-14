import GalaxyDirective from '../core/GalaxyDirective.js'

import GalaxyError from '../errors/GalaxyError.js'
import { createAnchor } from '../utils/generic.js'

export default class ConditionalDirective extends GalaxyDirective {
  static get is () {
    return '*if'
  }

  get isPlaceholder () {
    return this.$renderer.isPlaceholder
  }

  init () {
    this.anchor = createAnchor(`if: ${this.$value}`)
    this.render = this.isPlaceholder ? this._firstRenderMultiple : this._renderSingle

    if (this.isPlaceholder) {
      this.children = Array.from(this.$element.content.childNodes)

      if (!this.children.length) {
        throw new GalaxyError('placeholder element with a conditional must have at least one child node')
      }
    }
  }

  _renderSingle () {
    // TODO: Add hooks for future transitions

    const { isConnected } = this.$element

    if (this.$getter()) {
      !isConnected && this.anchor.replaceWith(this.$element)
    } else if (isConnected) {
      this.$element.replaceWith(this.anchor)
    }
  }

  _firstRenderMultiple () {
    this.$element.replaceWith(this.anchor)

    if (this.$getter()) {
      this._appendChildren()
    }

    this.render = this._renderMultiple
  }

  _renderMultiple () {
    if (this.$getter()) {
      this._appendChildren()
    } else {
      for (const child of this.children) {
        child.remove()
      }
    }
  }

  _appendChildren () {
    this.anchor.after(...this.children)
  }
}
