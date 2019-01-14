import config from '../../config.js'

import TemplateRenderer from '../Template.js'

import { isPlaceholder } from '../../utils/type-check.js'

/**
 * Renderer for void elements or elements without childs like:
 */
export default class VoidRenderer {
  constructor (element, scope, isolated) {

    /**
     *
     */
    this.scope = scope

    /**
     *
     */
    this.element = element

    /**
     * Loop elements need an isolated scope
     *
     * Note: We need to create a shallow copy
     * to avoid overrides a parent isolated scope
     */
    this.isolated = isolated

    /**
     *
     */
    this.locals = Object.create(null)

    /**
     *
     */
    this.isPlaceholder = isPlaceholder(element)

    /**
     * Hold directives to digest
     */
    this.directives = []

    this._init(element)
  }

  get isRenderable () {
    return this.directives.length
  }

  _init ($el) {
    const attributes = Array.from($el.attributes)

    for (const attribute of attributes) {
      const { name, value } = attribute

      if (TemplateRenderer.is(attribute)) {
        this.directives.push(new TemplateRenderer(attribute, this))
      }

      for (const Directive of config.directives) {

        // 1. Private match filter
        const match = Directive._match(name, $el)

        if (match) {
          const init = {
            name: match.name,
            args: match.args ? match.args.split('.') : [],
            value
          }

          // 2. Public match filter
          if (Directive.match(init, this)) {
            const directive = new Directive(init, this)

            // Initialize directive
            directive.init()

            // Check for renderable directives
            if (directive.$options.$render) {
              this.directives.push(directive)
            }

            if (!config.debug) $el.removeAttribute(name)
            break
          }
        }
      }
    }
  }

  render () {
    for (const directive of this.directives) {
      directive.render()
    }
  }
}
