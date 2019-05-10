import { isTextNode } from '../utils/type-check'

/**
 * Match text template interpolation
 *
 * @type {RegExp}
 */
const TEXT_TEMPLATE_REGEX = /{{.*?}}/

/**
 * Renderer for inline tag template binding: <h1>Hello {{ world }}</h1>
 */
export default class TemplateRenderer {
  constructor (text, { scope: { $compiler }, isolated }) {
    this.text = text

    const templateFn = $compiler.compileTemplate(text.data)

    this.getter = () => templateFn(isolated)
  }

  static is (node) {
    return isTextNode(node) && TEXT_TEMPLATE_REGEX.test(node.data)
  }

  render () {
    const value = String(this.getter())

    if (this.text.data !== value) {
      this.text.data = value
    }
  }
}
