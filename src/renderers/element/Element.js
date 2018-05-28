import ChildrenRenderer from './Children.js'

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

import { newIsolated } from '../../utils/generic.js'

const REFERENCE_ATTRIBUTE = 'ref'

export default class ElementRenderer {
  constructor (element, scope, isolated) {
    this.element = element
    this.scope = scope

    /**
     * Loop elements need an isolated scope
     *
     * Note: We need to create a shallow copy
     * to avoid overrides a parent isolated scope
     */
    this.isolated = newIsolated(isolated)

    /**
     * Hold directives to digest
     */
    this.directives = []

    /**
     * Hold attribute and template bindings to digest
     */
    this.bindings = []

    /**
     * Resolve children rendering
     */
    this.childrenRenderer = new ChildrenRenderer(element.childNodes, scope, this.isolated)

    // Attach children
    this._initDirectives(element)
    this._initBindings(element)
  }

  get isRenderable () {
    return (
      this.directives.length > 0 ||
      this.bindings.length > 0 ||
      this.childrenRenderer.renderers.length > 0 ||

      /**
       * Elements needs to be resolved included ones
       * which are only referenced
       */
      this.element.hasAttribute(REFERENCE_ATTRIBUTE)
    )
  }

  get isFlattenable () {
    return (
      this.childrenRenderer.renderers.length > 0 &&
      !this.directives.length &&
      !this.bindings.length
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

      // Render children
      this.childrenRenderer.render()
    }
  }
}
