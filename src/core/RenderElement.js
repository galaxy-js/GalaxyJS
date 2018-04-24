import config from '../config.js'

import RenderBinding from '../core/RenderBinding.js'
import RenderTemplate from '../core/RenderTemplate.js'
import RenderHTML from './RenderHTML.js'

import reference, { hasReference } from '../directives/reference.js'
import event, { isEvent } from '../directives/event.js'

import RenderLoop from '../directives/loop/RenderLoop.js'
import RenderBind from '../directives/RenderBind.js'
import RenderClass from '../directives/RenderClass.js'
import RenderConditional from '../directives/RenderConditional.js'

import { isTextNode, isElementNode } from '../utils/type-check.js'
import { newIsolated } from '../utils/generic.js'

export default class RenderElement {
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
     * Resolve children renders
     */
    this.children = []

    /**
     * Loop elements need an isolated scope
     *
     * Note: We need to create a shallow copy
     * to avoid overrides a parent isolated scope
     */
    this.isolated = newIsolated(isolated)

    // Attach bindings, directives and chilren
    this._init()
  }

  get isRenderable () {
    return (
      this.directives.length > 0 ||
      this.bindings.length > 0 ||
      this.children.length > 0
    )
  }

  _init () {
    const $el = this.element

    // Fragment (templates) has not attributes
    if ('attributes' in $el) {
      this._initDirectives($el)
      this._initBindings($el)
    }

    this._initChildren($el)
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

      // 2. Check :attribute or ::attribute
      } else if (RenderBinding.is(attribute)) {
        const Render = RenderClass.is(attribute) ? RenderClass : RenderBinding
        this.bindings.push(new Render(attribute, this))

      // 3. Check {{ binding }}
      } else if (RenderTemplate.is(attribute)) {
        this.bindings.push(new RenderTemplate(attribute, this))
      }
    }
  }

  _initChildren ($el) {
    for (const child of $el.childNodes) {
      if (isTextNode(child)) {
        // 1. Check {{{ binding }}}
        if (RenderHTML.is(child)) {
          this.children.push(new RenderHTML(child, this))

        // 2. Check {{ binding }}
        } else if (RenderTemplate.is(child)) {
          this.children.push(new RenderTemplate(child, this))
        }

      // 3. Element binding
      } else if (isElementNode(child)) {
        // The loop directive is resolved as a child
        if (RenderLoop.is(child)) {
          this.children.push(new RenderLoop(child, this))
        } else {
          const element = new RenderElement(child, this.scope, this.isolated)

          // Only consider a render element if its childs
          // or attributes has something to bind/update
          if (element.isRenderable) this.children.push(element)
        }
      }

      // ... ignore comment nodes
    }
  }

  render () {
    const $el = this.element

    for (const directive of this.directives) {
      directive.render()
    }

    // Don't perform updates on disconnected element
    if ($el.isConnected) {
      if ('attributes' in $el) {
        for (const binding of this.bindings) {
          binding.render()
        }

        // We need to resolve the reference first
        // since childs may need access to
        if (hasReference($el)) {
          reference($el, this.scope)
        }
      }

      for (const child of this.children) {
        child.render()
      }
    }
  }
}
