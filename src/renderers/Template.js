import { toString, differ } from '../utils/generic.js'
import { isDefined, isObject } from '../utils/type-check.js'
import { compileScopedGetter, getExpression, TEXT_TEMPLATE_REGEX } from '../compiler/index.js'

/**
 * Renderer for inline tag template binding:
 *
 *   1. Within text node: <h1>Hello {{ world }}</h1>
 *   2. As attribute interpolation: <input class="some-class {{ klass }}"/>
 */
export default class TemplateRenderer {
  constructor (node, context) {
    this.node = node
    this.context = context

    this.expression = getExpression(node.nodeValue)
    this.getter = compileScopedGetter(this.expression, context)

    this.value = null
  }

  static is ({ nodeValue }) {
    return TEXT_TEMPLATE_REGEX.test(nodeValue)
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
