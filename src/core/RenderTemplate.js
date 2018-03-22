import { compileNestedGetter, diff } from '../utils/evaluation.js'

const TEMPLATE_REGEX = /{{(.*?)}}/

export function needTemplate ({ nodeValue }) {
  return nodeValue.includes('{{')
}

export default class RenderTemplate {
  constructor (node) {
    this.node = node

    this.getter = compileNestedGetter(RenderTemplate.getExpression(node))
  }

  static getExpression (node) {
    // Hold inlined expressions
    const expressions = []

    let template = node.nodeValue
    let match

    while (match = template.match(TEMPLATE_REGEX)) {
      // Push left context and the expression itself
      expressions.push(`\`${RegExp['$`']}\``, `(${match[1].trim()})`)

      template = RegExp["$'"] // .rightContext
    }

    return expressions.join(' + ') + ` + \`${template}\``
  }

  render (state, isolated) {
    const value = String(this.getter(state, isolated))

    if (diff(this.node, value)) {
      this.node.nodeValue = value
    }
  }
}
