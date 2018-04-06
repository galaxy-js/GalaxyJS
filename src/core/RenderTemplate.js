import { toString } from '../utils/generic.js'
import { isDefined, isObject } from '../utils/type-check.js'
import { compileScopedGetter, differ, getExpression } from '../utils/compiler.js'

export default class RenderTemplate {
  constructor (node, context) {
    this.node = node
    this.context = context

    this.expression = getExpression(node.nodeValue)
    this.getter = compileScopedGetter(this.expression, context)
  }

  static is ({ nodeValue }) {
    return nodeValue.includes('{{')
  }

  render () {
    const value = this.getter()

    // Normalized value to avoid null or undefined
    const normalized = isDefined(value) ? toString(value) : ''

    if (differ(this.node, normalized)) {
      this.node.nodeValue = normalized
    }
  }
}
