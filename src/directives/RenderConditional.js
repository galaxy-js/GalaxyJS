import config from '../config.js'

import { digestData } from '../utils/generic.js'
import { compileGetter } from '../utils/evaluation.js'

export const CONDITIONAL_ATTRIBUTE = 'g-if'

export default class RenderConditional {
  constructor (element) {
    this.element = element
    this.condition = digestData(element, CONDITIONAL_ATTRIBUTE)

    this.anchor = document.createComment(config.debug ? ` gIf: ${this.condition} ` : ' ')

    this.getter = compileGetter(this.condition)
  }

  render (state) {
    if (this.getter(state)) {
      if (!this.element.isConnected) {
        this.anchor.parentNode.replaceChild(this.element, this.anchor)
      }
    } else if (this.element.isConnected) {
      this.element.parentNode.replaceChild(this.anchor, this.element)
    }
  }
}
