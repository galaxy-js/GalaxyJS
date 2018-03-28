import { toString } from '../utils/generic.js'
import { isDefined, isObject } from '../utils/type-check.js'
import { compileNestedGetter, diff } from '../utils/evaluation.js'

const TEMPLATE_REGEX = /{{(.*?)}}/

export function needTemplate ({ nodeValue }) {
  return nodeValue.includes('{{')
}

export default class RenderTemplate {
  constructor (node) {
    this.node = node

    this.expression = RenderTemplate.getExpression(node)
    this.getter = compileNestedGetter(this.expression)
  }

  static getExpression (node) {
    // Hold inlined expressions
    const expressions = []

    let template = node.nodeValue
    let match

    while (match = template.match(TEMPLATE_REGEX)) {
      const rawLeft = RegExp['$`']
      const expression = match[1].trim()

      // Push wrapped left context
      if (rawLeft) expressions.push(`\`${rawLeft}\``)

      // Push isolated expression itself
      if (expression) expressions.push(`(${expression})`)

      template = RegExp["$'"] // .rightContext
    }

    // Push residual template expression
    if (template) expressions.push(`\`${template}\``)

    return expressions.join(' + ')
  }

  render (state, isolated) {
    const value = this.getter(state, isolated)

    // Normalized value to avoid null or undefined
    const normalized = isDefined(value) ? toString(value) : ''

    if (diff(this.node, normalized)) {
      this.node.nodeValue = normalized
    }
  }
}
