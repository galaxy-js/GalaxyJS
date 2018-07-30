import BaseRenderer from '../renderers/Base.js'

import { getAttr, createAnchor } from '../utils/generic.js'

const CONDITIONAL_DIRECTIVE = '*if'

export default class ConditionalDirective extends BaseRenderer {
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

  patch (element, value) {
    if (value) {
      if (!element.isConnected) {
        this.anchor.parentNode.replaceChild(element, this.anchor)
      }
    } else if (element.isConnected) {
      element.parentNode.replaceChild(this.anchor, element)
    }
  }
}
