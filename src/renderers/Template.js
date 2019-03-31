/**
 * Match text template interpolation
 *
 * @type {RegExp}
 */
const TEXT_TEMPLATE_REGEX = /{{.*?}}/

/**
 * Renderer for inline tag template binding:
 *
 *   1. Within text node: <h1>Hello {{ world }}</h1>
 *   2. As attribute interpolation: <input class="some-class {{ klass }}"/>
 */
export default class TemplateRenderer {
  constructor (node, { scope, isolated }) {
    this.node = node

    const templateFn = scope.$compiler.compileTemplate(node.nodeValue)

    this.getter = () => templateFn(isolated)
  }

  static is ({ nodeValue }) {
    return TEXT_TEMPLATE_REGEX.test(nodeValue)
  }

  render () {
    const value = this.getter()

    if (this.node.nodeValue !== value) {
      this.node.nodeValue = value
    }
  }
}
