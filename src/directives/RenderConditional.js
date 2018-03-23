import config from '../config.js'

import { digestData } from '../utils/generic.js'
import { compileNestedGetter, createAnchor } from '../utils/evaluation.js'

export const CONDITIONAL_ATTRIBUTE = 'g-if'

export function needConditional ({ attributes }) {
  return CONDITIONAL_ATTRIBUTE in attributes
}

export default class RenderConditional {
  constructor (element) {
    this.element = element
    this.condition = digestData(element, CONDITIONAL_ATTRIBUTE)

    this.anchor = createAnchor(`gIf: ${this.condition}`)

    this.getter = compileNestedGetter(this.condition)
  }

  render (state, isolated) {
    if (this.getter(state, isolated)) {
      if (!this.element.isConnected) {
        this.anchor.parentNode.replaceChild(this.element, this.anchor)
      }
    } else if (this.element.isConnected) {
      this.element.parentNode.replaceChild(this.anchor, this.element)
    }
  }
}
