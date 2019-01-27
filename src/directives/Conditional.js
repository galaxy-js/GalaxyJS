import GalaxyDirective from '../core/GalaxyDirective.js'

import GalaxyError from '../errors/GalaxyError.js'
import { createAnchor, dispatchTransitionEvent } from '../utils/generic.js'

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
    const { isConnected } = this.$element

    let transitionType

    if (this.$getter()) {
      !isConnected && (transitionType = 'enter')
    } else if (isConnected) {
      transitionType = 'leave'
    }

    if (transitionType) {
      this._dispatchTransitionEvent(transitionType, this.$element, () => {
        const isLeave = transitionType === 'leave'
        this[isLeave ? '$element' : 'anchor'].replaceWith(this[isLeave ? 'anchor' : '$element'])
      })
    }
  }

  _firstRenderMultiple () {

    // Replace placeholder with its anchor
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
        if (child.isConnected) {
          this._dispatchTransitionEvent('leave', child, () => child.remove())
        }
      }
    }
  }

  _appendChildren () {
    let index = this.children.length
    const { parentNode } = this.anchor

    while (index--) {
      const child = this.children[index]

      if (!child.isConnected) {
        this._dispatchTransitionEvent('enter', child, () => {
          parentNode.insertBefore(child, this.anchor.nextSibling)
        })
      }
    }
  }

  _dispatchTransitionEvent (type, target, transitionCb) {
    dispatchTransitionEvent(this.$element, `if:${type}`, target, transitionCb)
  }
}
