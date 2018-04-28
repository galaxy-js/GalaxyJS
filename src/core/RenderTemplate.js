import { toString, differ } from '../utils/generic.js'
import { isDefined, isObject } from '../utils/type-check.js'
import { compileScopedGetter, getExpression, TEXT_TEMPLATE } from '../compiler/index.js'

export default class RenderTemplate {
  constructor (node, context) {
    this.node = node
    this.context = context

    this.expression = getExpression(node.nodeValue)
    this.getter = compileScopedGetter(this.expression, context)

    this.value = null
  }

  static is ({ nodeValue }) {
    return TEXT_TEMPLATE.test(nodeValue)
  }

  render () {
    const value = this.getter()

    // Normalized value to avoid null or undefined
    const normalized = this.value = isDefined(value) ? toString(value) : ''

    if (differ(this.node, normalized)) {
      this.node.nodeValue = normalized
    }
  }
}
