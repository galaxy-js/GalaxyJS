/**
 * Directives
 */
import ConditionalDirective from '../../directives/Conditional.js'
import BindDirective from '../../directives/model/Bind.js'
import InputDirective from '../../directives/model/Input.js'
import CheckboxDirective from '../../directives/model/Checkbox.js'
import RadioDirective from '../../directives/model/Radio.js'
import SelectDirective from '../../directives/model/Select.js'

/**
 * Bindings
 */
import TemplateRenderer from '../Template.js'
import BindingDirective from '../../directives/binding/Binding.js'
import ClassDirective from '../../directives/binding/Class.js'
import StyleDirective from '../../directives/binding/Style.js'
import event, { isEvent } from '../../directives/event.js'

const REFERENCE_ATTRIBUTE = 'ref'

/**
 * Renderer for void elements or elements without childs like:
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

  static is ({ childNodes }) {
    return childNodes.length === 0
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
    if (ConditionalDirective.is($el)) {
      this.directives.push(new ConditionalDirective($el, this))
    }

    if (BindDirective.is($el)) {
      const Renderer = CheckboxDirective.is($el) ? CheckboxDirective
        : RadioDirective.is($el) ? RadioDirective
        : InputDirective.is($el) ? InputDirective
        : SelectDirective.is($el) ? SelectDirective
        : null

      if (Renderer) {
        this.directives.push(new Renderer($el, this))
      }
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
      } else if (BindingDirective.is(attribute)) {
        const binding = new (
          ClassDirective.is(attribute)
            ? ClassDirective
            : StyleDirective.is(attribute)
              ? StyleDirective
              : BindingDirective)(attribute, this)

        // Enable quick access
        this.bindings[binding.name] = binding

        this.bindings.push(binding)
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
