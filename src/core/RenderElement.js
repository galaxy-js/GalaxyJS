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
     * Renders could contain directive, attribute and child renders.
     */
    this.directives = []

    /**
     * Renders could contain directive, attribute and child renders.
     */
    this.renders = []

    this._init()
  }

  _init () {
    const $el = this.element

    if ('attributes' in $el) {
      // Since a loop takes the element as a template
      // we don't need to render its childs, attributes, etc...
      if (needLoop($el)) return this.addDirective(new RenderLoop($el, this.scope))

      if (needReference($el)) {
        reference($el, this.scope)
      }

      if (needConditional($el)) {
        this.addDirective(new RenderConditional($el))
      }

      if (needBind($el)) {
        this.addDirective(new RenderBind($el))
      }

      this._initAttributes()
    }

    this._initChildren()
  }

  _initAttributes () {
    const { attributes } = this.element

    for (const attribute of attributes) {
      const { name } = attribute
      const isDirect = name.startsWith(BIND_TOKEN)

      if (isDirect || hasTemplate(attribute)) {
        const observed = document.createAttribute(name.slice(1))
        observed.value = attribute.value

        attributes.setNamedItem(observed)

        if (!config.debug) this.element.removeAttribute(name)

        this.addRender(new RenderNode(observed, isDirect))
      } else if (name.startsWith(EVENT_TOKEN)) {
        event(this.element, name, this.scope, this.isolated)
      }
    }
  }

  _initChildren () {
    for (const child of this.element.childNodes) {
      if (isTextNode(child) && hasTemplate(child)) {
        this.addRender(new RenderNode(child, false))
      } else if (isElementNode(child)) {
        const render = new RenderElement(child, this.scope, this.isolated)

        // Only consider a render element if its childs
        // or attributes has something to bind/update
        if (render.isRenderable) {
          this.addRender(render)
        }
      }

      // ... ignore comment nodes
    }
  }

  get isRenderable () {
    return (
      this.directives.length > 0 ||
      this.renders.length > 0
    )
  }

  addDirective (render) {
    this.directives.push(render)
  }

  addRender (render) {
    this.renders.push(render)
  }

  mountAt (parent, state) {
    parent.appendChild(this.element)
    this.render(state)
  }

  render (state) {
    // Merge with isolated scope
    state = Object.assign({}, state, this.isolated)

    for (const directive of this.directives) {
      directive.render(state)
    }

    // TODO: don't perform updates on disconnected element
    if (this.element.isConnected) {
      for (const render of this.renders) {
        render.render(state)
      }
    }
  }
}
