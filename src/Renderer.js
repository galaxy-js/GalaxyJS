import nextTick from './utils/next-tick.js'
import { isTextNode, isElementNode, hasTemplate } from './utils/type-check.js'

export default class Renderer {
  constructor (nodes) {
    this._nodes = nodes
    this._renders = []
    this._events = []

    this.rendering = false

    this._setupRender(nodes)
  }

  static get TEMPLATE_REGEX () {
    return /{{(.*?)}}/
  }

  static get EVENT_REGEX () {
    return /^[\w\d]+\(([^)]*)\)$/
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

  static getEvaluator (expression) {
    return new Function('context', `
      with (context) {
        return ${expression}
      }
    `)
  }

  _attachRender (node) {
    if (hasTemplate(node)) {
      const evaluator = Renderer.getEvaluator(Renderer.getExpression(node.nodeValue))

      this._renders.push(state => {
        const evaluated = evaluator(state)

        if (evaluated !== node.nodeValue) {
          node.nodeValue = evaluated
        }
      })
    }
  }

  _attachEvent (element, attribute) {
    let match
    let fnCall = attribute.nodeValue

    // Determine a function call
    if (match = fnCall.match(Renderer.EVENT_REGEX)) {
      const args = match[1]

      const evaluator = Renderer.getEvaluator(
        // Intercept arguments
        args
          ? fnCall.replace(args, `state, ${args}`)
          : `${fnCall.slice(0, -1)}state)`
      )

      element.removeAttribute(attribute.name)

      this._events.push(component => {
        element.addEventListener(attribute.name.slice(1), event => {
          // Externalize event
          component.$event = event

          evaluator(component)
        })
      })
    }
  }

  _setupRender (nodes) {
    for (const node of nodes) {
      if (isTextNode(node)) {
        this._attachRender(node)
      } else if (isElementNode(node)) {
        for (const attribute of node.attributes) {
          if (attribute.name.startsWith('@')) {
            this._attachEvent(node, attribute)
          } else {
            this._attachRender(attribute)
          }
        }
      }

      if (node.firstChild) {
        this._setupRender(node.childNodes)
      }
    }
  }

  setupEvents (component) {
    for (const _event of this._events) {
      _event(component)
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
