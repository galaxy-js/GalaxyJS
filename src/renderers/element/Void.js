/**
 * Directives
 */
import ConditionalRenderer from '../directives/Conditional.js'
import BindRenderer from '../directives/Bind.js'

/**
 * Bindings
 */
import TemplateRenderer from '../Template.js'
import BindingRenderer from '../directives/binding/Binding.js'
import ClassRenderer from '../directives/binding/Class.js'
import StyleRenderer from '../directives/binding/Style.js'
import event, { isEvent } from '../directives/event.js'

const REFERENCE_ATTRIBUTE = 'ref'

/**
 * Taken from MDN
 *
 * @see https://developer.mozilla.org/en-US/docs/Glossary/Empty_element
 */
const VOID_TAGS = [
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr'
]

/**
 * Renderer for void elements or elements without childs like:
 *
 *  - area
 *  - base
 *  - br
 *  - col
 *  - embed
 *  - hr
 *  - img
 *  - input
 *  - link
 *  - meta
 *  - param
 *  - source
 *  - track
 *  - wbr
 */
export default class VoidRenderer {
  constructor (element, scope, isolated) {
    this.element = element
    this.scope = scope

    /**
     * Loop elements need an isolated scope
     *
     * Note: We need to create a shallow copy
     * to avoid overrides a parent isolated scope
     */
    this.isolated = isolated

    /**
     * Hold directives to digest
     */
    this.directives = []

    /**
     * Hold attribute and template bindings to digest
     */
    this.bindings = []

    this._initDirectives(element)
    this._initBindings(element)
  }

  static is ({ tagName }) {
    return VOID_TAGS.indexOf(tagName.toLowerCase()) > -1
  }

  get isRenderable () {
    return (
      this.directives.length > 0 ||
      this.bindings.length > 0 ||

      /**
       * Elements needs to be resolved included ones
       * which are only referenced
       */
      this.element.hasAttribute(REFERENCE_ATTRIBUTE)
    )
  }

  _initDirectives ($el) {
    if (ConditionalRenderer.is($el)) {
      this.directives.push(new ConditionalRenderer($el, this))
    }

    if (BindRenderer.is($el)) {
      this.directives.push(new BindRenderer($el, this))
    }
  }

  _initBindings ($el) {
    // Avoid live list
    const attributes = Array.from($el.attributes)

    for (const attribute of attributes) {
      // 1. Check @binding
      if (isEvent(attribute)) {
        event(attribute, this)

      // 2. Check {{ binding }}
      } else if (TemplateRenderer.is(attribute)) {
        this.bindings.push(new TemplateRenderer(attribute, this))

      // 3. Check :attribute or ::attribute
      } else if (BindingRenderer.is(attribute)) {
        this.bindings.push(new (
          ClassRenderer.is(attribute)
            ? ClassRenderer
            : StyleRenderer.is(attribute)
              ? StyleRenderer
              : BindingRenderer)(attribute, this))
      }
    }
  }

  render () {
    const $el = this.element

    for (const directive of this.directives) {
      directive.render()
    }

    // Don't perform updates on disconnected element
    if ($el.isConnected) {
      for (const binding of this.bindings) {
        binding.render()
      }

      /**
       * ref: It's a special directive/attribute which holds
       * native elements instantiation within the scope
       */
      const ref = $el.getAttribute(REFERENCE_ATTRIBUTE)

      // We need to resolve the reference first
      // since possible childs may need access to
      if (ref) {

        // Reference attribute isn't removed
        this.scope.$refs.set(ref, $el)
      }
    }
  }
}
