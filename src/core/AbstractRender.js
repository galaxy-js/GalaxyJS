import RenderConditional from '../directives/RenderConditional.js'
import RenderBind from '../directives/RenderBind.js'

import RenderTemplate from './RenderTemplate.js'
import RenderBinding from './RenderBinding.js'
import RenderClass from '../directives/RenderClass.js'
import RenderStyle from '../directives/RenderStyle.js'

import reference, { hasReference } from '../directives/reference.js'
import event, { isEvent } from '../directives/event.js'

import { newIsolated } from '../utils/generic.js'

export default class AbstractRender {
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
    if (RenderConditional.is($el)) {
      this.directives.push(new RenderConditional($el, this))
    }

    if (RenderBind.is($el)) {
      this.directives.push(new RenderBind($el, this))
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
      } else if (RenderTemplate.is(attribute)) {
        this.bindings.push(new RenderTemplate(attribute, this))

      // 3. Check :attribute or ::attribute
      } else if (RenderBinding.is(attribute)) {
        this.bindings.push(new (
          RenderClass.is(attribute)
            ? RenderClass
            : RenderStyle.is(attribute)
              ? RenderStyle
              : RenderBinding)(attribute, this))
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

      // We need to resolve the reference first
      // since childs may need access to
      if (hasReference($el)) {
        reference($el, this.scope)
      }
    }
  }
}
