import { isElementNode } from '../utils/type-check.js'
import { getEvaluator, hasTemplate, isTextWithoutTemplate } from '../utils/evaluation.js'

import RenderNode from './RenderNode.js'

export default class RenderElement {
  static get EVENT_INDICATOR() {
    return '@'
  }

  static get EVENT_REGEX () {
    return /^[\w\d]+\(([^)]*)\)$/
  }

  // `scope` is the component itself
  constructor (element, scope) {
    this.element = element
    this.scope = scope

    this.attributeRenders = []

    this._attachAttributes()
  }

  _attachAttributes () {
    for (const attribute of this.element.attributes) {
      let match
      const { name, nodeValue } = attribute
      const isEvent = name.startsWith(RenderElement.EVENT_INDICATOR)

      if (!isEvent && hasTemplate(attribute)) {
        this.attributeRenders.push(new RenderNode(attribute))
      } else if (isEvent && (match = nodeValue.match(RenderElement.EVENT_REGEX)) /* Check if value is a binding event expression */) {
        // Determine a function call
        const args = match[1]

        const evaluator = getEvaluator(
          // Intercept arguments
          args
            ? nodeValue.replace(args, `state, ${args}`)
            : `${nodeValue.slice(0, -1)}state)`
        )

        this.element.removeAttribute(name)

        this.element.addEventListener(name.slice(1), event => {
          // Externalize event
          this.scope.$event = event

          evaluator(this.scope)

          this.scope.$event = null
        })
      }
    }
  }

  isRenderable () {
    return this.attributeRenders.length > 0
  }

  render (state = this.scope.state, refresh) {
    if (refresh) {
      this.attributeRenders.length = 0
      this._attachAttributes()
    }

    for (const attributeRender of this.attributeRenders) {
      attributeRender.render(state)
    }
  }
}
