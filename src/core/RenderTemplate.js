import { toString } from '../utils/generic.js'
import { isDefined, isObject } from '../utils/type-check.js'
import { compileNestedGetter, diff, getExpression } from '../utils/evaluation.js'

const TEMPLATE_REGEX = /{{(.*?)}}/

export function needTemplate ({ nodeValue }) {
  return nodeValue.includes('{{')
}

export default class RenderTemplate {
  constructor (node, scope, isolated) {
    this.node = node
    this.scope = scope

    // Inherit isolated scope
    this.isolated = isolated

    this.expression = getExpression(node.nodeValue, TEMPLATE_REGEX)
    this.getter = compileNestedGetter(this.expression)
  }

  render () {
    const value = this.getter(this.scope.state, this.isolated)

    // Normalized value to avoid null or undefined
    const normalized = isDefined(value) ? toString(value) : ''

    if (diff(this.node, normalized)) {
      this.node.nodeValue = normalized
    }
  }
}
