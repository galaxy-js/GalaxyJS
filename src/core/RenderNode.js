import { compileNestedGetter, diff } from '../utils/evaluation.js'

const TEMPLATE_REGEX = /{{(.*?)}}/

/**
 * Render for one-way binding
 */
export default class RenderNode {
  // `scope` is the component itself
  constructor (node, isDirect) {
    this.node = node
    this.isDirect = isDirect

    // {{ template }} or :attribute -> compile state
    this.getter = compileNestedGetter(this.isDirect ? this.node.value : this.getExpression())
  }

  getExpression () {
    // Hold inlined expressions
    const expressions = []

    let template = this.node.nodeValue
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

    if (diff(this.node, value)) {
      this.node.nodeValue = value
    }
  }
}
