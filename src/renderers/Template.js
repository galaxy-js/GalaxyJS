import BaseRenderer from './Base.js'

import { differ } from '../utils/generic.js'
import { isDefined, isObject } from '../utils/type-check.js'
import { getExpression, TEXT_TEMPLATE_REGEX } from '../compiler/index.js'

/**
 * Renderer for inline tag template binding:
 *
 *   1. Within text node: <h1>Hello {{ world }}</h1>
 *   2. As attribute interpolation: <input class="some-class {{ klass }}"/>
 */
export default class TemplateRenderer extends BaseRenderer {
  constructor (node, context) {
    super(
      node, context,
      getExpression(node.nodeValue)
    )
  }

  static is ({ nodeValue }) {
    return TEXT_TEMPLATE_REGEX.test(nodeValue)
  }

  patch (node, value) {
    // Normalized value to avoid null or undefined
    const normalized = isDefined(value) ? String(value) : ''

    if (differ(node, normalized)) {
      node.nodeValue = normalized
    }
  }
}
