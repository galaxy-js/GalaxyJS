import ConditionalRenderer from '../directives/Conditional.js'
import BindRenderer from '../directives/Bind.js'

import TemplateRenderer from '../Template.js'
import BindingRenderer from '../directives/binding/Binding.js'
import ClassRenderer from '../directives/binding/Class.js'
import StyleRenderer from '../directives/binding/Style.js'

import event, { isEvent } from '../directives/event.js'

import { newIsolated } from '../../utils/generic.js'

/**
 * Base renderer which resolves:
 *
 *   1. Directive bindings
 *   2. Template and attribute bindings
 */
export default class BaseRenderer {
  constructor (element, scope, isolated) {
    this.element = element
    this.scope = scope

    /**
     * Hold directives to digest
     */
    this.directives = []

    /**
     * Hold attribute and template bindings to digest
     */
    this.bindings = []

    /**
     * Loop elements need an isolated scope
     *
     * Note: We need to create a shallow copy
     * to avoid overrides a parent isolated scope
     */
    this.isolated = newIsolated(isolated)

    this._init()
  }

  _init () {
    const $el = this.element

    // Fragment (templates) has not attributes
    if ('attributes' in $el) {
      this._initDirectives($el)
      this._initBindings($el)
    }
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
    if ($el.isConnected && 'attributes' in $el) {
      for (const binding of this.bindings) {
        binding.render()
      }

      /**
       * ref: It's a special directive/attribute which holds
       * native elements instantiation within the scope
       */
      const ref = $el.getAttribute('ref')

      // We need to resolve the reference first
      // since possible childs may need access to
      if (ref) {

        // Reference isn't removed
        this.scope.$refs.set(ref, $el)
      }
    }
  }
}
