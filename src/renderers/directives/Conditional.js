import BaseRenderer from '../Base.js'

import { getAttr, createAnchor } from '../../utils/generic.js'

const CONDITIONAL_DIRECTIVE = '*if'

export default class ConditionalRenderer extends BaseRenderer {
  constructor (element, context) {
    super(
      element, context,
      getAttr(element, CONDITIONAL_DIRECTIVE)
    )

    this.anchor = createAnchor(`if: ${this.condition}`)
  }

  static is ({ attributes }) {
    return CONDITIONAL_DIRECTIVE in attributes
  }

  patch (value) {
    if (value) {
      if (!this.element.isConnected) {
        this.anchor.parentNode.replaceChild(this.element, this.anchor)
      }
    } else if (this.element.isConnected) {
      this.element.parentNode.replaceChild(this.anchor, this.element)
    }
  }
}
