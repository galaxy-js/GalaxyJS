import { isDefined } from '../utils/type-check.js'
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
    const value = this.getter(state, isolated)

    // TODO: Handle objects without __proto__
    const normalized = isDefined(value) ? String(value) : ''

    if (diff(this.node, normalized)) {
      this.node.nodeValue = normalized
    }
  }
}
