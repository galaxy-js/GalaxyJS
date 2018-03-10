import nextTick from './utils/next-tick.js'
import { isTextNode, isElementNode, hasTemplate } from './utils/type-check.js'

export default class Renderer {
  constructor (nodes) {
    this._nodes = nodes
    this._renders = []

    this.rendering = false

    this._setupRender(nodes)
  }

  static get TEMPLATE_REGEX () {
    return /{{(.*?)}}/
  }

  static getExpression (template) {
    // Save inline expressions
    let parsedExpression = ''

    let match

    while (match = template.match(Renderer.TEMPLATE_REGEX)) {
      const leftText = RegExp.leftContext

      if (leftText) parsedExpression += JSON.stringify(leftText)

      const expression = match[1].trim()

      if (expression) parsedExpression += `${leftText ? ' + ' : ''}(${expression})`

      template = RegExp.rightContext
    }

    return parsedExpression + (template ? `+ ${JSON.stringify(template)}` : '')
  }

  _attachRender (node) {
    if (hasTemplate(node)) {
      const transformer = new Function(`
        with (this) {
          return ${Renderer.getExpression(node.nodeValue)}
        }
      `)

      this._renders.push(state => {
        const transformed = transformer.call(state)

        if (transformed !== node.nodeValue) {
          node.nodeValue = transformed
        }
      })
    }
  }

  _setupRender (nodes) {
    for (const node of nodes) {
      if (isTextNode(node)) {
        this._attachRender(node)
      } else if (isElementNode(node)) {
        for (const attribute of node.attributes) {
          this._attachRender(attribute)
        }
      }

      if (node.firstChild) {
        this._setupRender(node.childNodes)
      }
    }
  }

  render (state, refresh = false) {
    if (!this.rendering) {
      this.rendering = true

      if (refresh) {
        this._setupRender(this._nodes)
      }

      nextTick(() => {
        for (const _render of this._renders) {
          _render(state)
        }

        this.rendering = false
      })
    }
  }
}
