import config from '../config.js'

import RenderNode from '../core/RenderNode.js'

import event, { EVENT_TOKEN } from '../directives/event.js'
import reference, { needReference } from '../directives/reference.js'

import RenderLoop, { needLoop } from '../directives/RenderLoop.js'
import RenderBind, { needBind, BIND_TOKEN } from '../directives/RenderBind.js'
import RenderConditional, { needConditional } from '../directives/RenderConditional.js'

import { isTextNode, isElementNode } from '../utils/type-check.js'
import { hasTemplate } from '../utils/evaluation.js'

export default class RenderElement {
  constructor (element, scope, isolated = {}) {
    this.element = element
    this.scope = scope

    // Isolated scope
    /**
     * We need an isolated scope which contains
     * individually data taken from RenderLoop
     */
    this.isolated = Object.assign({}, isolated)

    /**
     * Hold directives to digest
     */
    this.directives = []

    /**
     * Hold attribute bindings to digest
     */
    this.bindings = []

    /**
     * Resolve children renders
     */
    this.children = []

    this._init()
  }

  _init () {
    const $el = this.element

    if ('attributes' in $el) {
      // Since a loop takes the element as a template
      // we don't need to render its childs, attributes, etc...
      if (needLoop($el)) return this.addDirective(new RenderLoop($el, this.scope))

      if (needConditional($el)) {
        this.addDirective(new RenderConditional($el))
      }

      if (needBind($el)) {
        this.addDirective(new RenderBind($el))
      }

      this._initBindings()
    }

    this._initChildren()
  }

  _initBindings () {
    const { attributes } = this.element

    for (const attribute of attributes) {
      const { name } = attribute

      // It's direct?
      if (name.startsWith(BIND_TOKEN)) {
        const observed = document.createAttribute(name.slice(1))
        observed.value = attribute.value

        attributes.setNamedItem(observed)

        if (!config.debug) this.element.removeAttribute(name)

        this.addBinding(observed, true)
      } else if (name.startsWith(EVENT_TOKEN)) {
        event(this.element, name, this.scope, this.isolated)
      } else if (hasTemplate(attribute)) {
        this.addBinding(attribute, false)
      }
    }
  }

  _initChildren () {
    for (const child of this.element.childNodes) {
      if (isTextNode(child) && hasTemplate(child)) {
        this.addChild(new RenderNode(child, false))
      } else if (isElementNode(child)) {
        const element = new RenderElement(child, this.scope, this.isolated)

        // Only consider a render element if its childs
        // or attributes has something to bind/update
        if (element.isRenderable) {
          this.addChild(element)
        }
      }

      // ... ignore comment nodes
    }
  }

  get isRenderable () {
    return (
      this.directives.length > 0 ||
      this.bindings.length > 0 ||
      this.children.length > 0
    )
  }

  addChild (child) {
    this.children.push(child)
  }

  addDirective (directive) {
    this.directives.push(directive)
  }

  addBinding (node, direct) {
    this.bindings.push(new RenderNode(node, direct))
  }

  mountAt (parent, state) {
    parent.appendChild(this.element)
    this.render(state, this.isolated)
  }

  render (state) {
    for (const directive of this.directives) {
      directive.render(state, this.isolated)
    }

    // Don't perform updates on disconnected element
    if (this.element.isConnected) {
      if ('attributes' in this.element) {
        for (const binding of this.bindings) {
          binding.render(state, this.isolated)
        }

        // We need to resolve the reference first
        // since childs may need access to
        if (needReference(this.element)) {
          reference(this.element, this.scope)
        }
      }

      for (const child of this.children) {
        child.render(state, this.isolated)
      }
    }
  }
}
