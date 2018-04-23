import config from '../config.js'

import { digestData, createAnchor } from '../utils/generic.js'
import { compileScopedGetter } from '../compiler/index.js'

const CONDITIONAL_ATTRIBUTE = '*if'

export default class RenderConditional {
  constructor (element, context) {
    this.element = element
    this.context = context

    this.anchor = createAnchor(`if: ${this.condition}`)

    this.condition = digestData(element, CONDITIONAL_ATTRIBUTE)
    this.getter = compileScopedGetter(this.condition, this.context)
  }

  static is ({ attributes }) {
    return CONDITIONAL_ATTRIBUTE in attributes
  }

  render () {
    if (this.getter()) {
      if (!this.element.isConnected) {
        this.anchor.parentNode.replaceChild(this.element, this.anchor)
      }
    } else if (this.element.isConnected) {
      this.element.parentNode.replaceChild(this.anchor, this.element)
    }
  }
}
