import nextTick from './utils/next-tick.js'

export default class Renderer {
  constructor (nodes) {
    this._nodes = nodes
    this._renders = []

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

  _setupRender (nodes) {
    for (const node of nodes) {
      if (node.nodeType === Node.TEXT_NODE && node.data.indexOf('{{') > -1) {
        const transformer = new Function(`
          with (this) {
            return ${Renderer.getExpression(node.data)}
          }
        `)

        this._renders.push(state => {
          const transformed = transformer.call(state)

          if (transformed !== node.data) {
            node.data = transformed
          }
        })
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        // TODO: Check attributes binding
      }

      if (node.firstChild) {
        this._setupRender(node.childNodes)
      }
    }
  }

  render (state, refresh = false) {
    if (refresh) {
      this._setupRender(this._nodes)
    }

    nextTick(() => {
      for (const _render of this._renders) {
        _render(state)
      }
    })
  }
}
