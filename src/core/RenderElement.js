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

    this.renders = []

    this._attach()
  }

  _attach () {
    this._attachAttributes()
    this._attachChildren()
  }

  _attachAttributes () {
    for (const attribute of this.element.attributes) {
      let match
      const { name, nodeValue } = attribute

      if (!name.startsWith(RenderElement.EVENT_INDICATOR) && hasTemplate(attribute)) {
        this.addRender(attribute)

        // Check if value is a binding event expression
      } else if (match = nodeValue.match(RenderElement.EVENT_REGEX)) {
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

  _attachChildren () {
    for (const child of this.element.childNodes) {
      if (!isTextWithoutTemplate(child)) {
        this.addRender(child)
      }
    }
  }

  addRender (child) {
    let render
    let isRenderable = true

    if (isElementNode(child)) {
      render = new RenderElement(child, this.scope /* Simple scope inheritance */)
      isRenderable = render.renders.length > 0
    } else {
      render = new RenderNode(child)
    }

    if (isRenderable) this.renders.push(render)
  }

  render (state = this.scope.state, refresh) {
    if (refresh) {
      this.renders.length = 0
      this._attach()
    }

    for (const render of this.renders) {
      render.render(state)
    }
  }
}
