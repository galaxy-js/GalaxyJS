import { compileTemplate, TEXT_TEMPLATE_REGEX } from '../compiler/index.js'

/**
 * Renderer for inline tag template binding:
 *
 *   1. Within text node: <h1>Hello {{ world }}</h1>
 *   2. As attribute interpolation: <input class="some-class {{ klass }}"/>
 */
export default class TemplateRenderer {
  constructor (node, renderer) {
    this.node = node
    this.renderer = renderer

    this.getter = compileTemplate(node.nodeValue)
  }

  static is ({ nodeValue }) {
    return TEXT_TEMPLATE_REGEX.test(nodeValue)
  }

  render () {
    const value = this.getter(this.renderer.scope, this.renderer.isolated)

    if (this.node.nodeValue !== value) {
      this.node.nodeValue = value
    }
  }
}
