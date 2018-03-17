import RenderNode from './RenderNode.js'

import { isTextNode, isElementNode } from '../utils/type-check.js'
import { hasTemplate } from '../utils/evaluation.js'

import reference, { REF_DATA } from '../directives/reference.js'
import bind, { BIND_DATA } from '../directives/bind.js'
import event from '../directives/event.js'
import conditional, { CONDITIONAL_DATA } from '../directives/conditional.js'

/**
 * Renderer is to inline render objects
 * and to avoid multiple and nested unecessary
 * render node childs
 */
export default class Renderer {
  static get BIND_INDICATOR () {
    return ':'
  }

  static get EVENT_INDICATOR () {
    return '@'
  }

  constructor (scope) {
    // Set to root fragment
    this.scope = scope
    this.renders = []

    this.addRenders(scope.$root.childNodes)
  }

  addRenders (nodes) {
    for (const node of nodes) {
      this.addRender(node)
    }
  }

  addRender (node) {
    if (isTextNode(node) && hasTemplate(node)) {
      this.renders.push(new RenderNode(node, false))
    } else if (isElementNode(node)) {
      if (REF_DATA in node.dataset) {
        reference(node, this.scope)
      }

      if (BIND_DATA in node.dataset) {
        this.renders.push(bind(node, this.scope))
      }

      if (CONDITIONAL_DATA in node.dataset) {
        this.renders.push(conditional(node))
      }

      for (const attribute of node.attributes) {
        const { name } = attribute
        const isDirect = name.startsWith(Renderer.BIND_INDICATOR)

        if (isDirect || hasTemplate(attribute)) {
          const observed = document.createAttribute(name.slice(1))
          observed.value = attribute.value

          node.attributes.setNamedItem(observed)
          node.removeAttribute(name)

          this.renders.push(new RenderNode(observed, isDirect))
        } else if (name.startsWith(Renderer.EVENT_INDICATOR)) {
          event(node, attribute, this.scope)
        }
      }

      this.addRenders(node.childNodes)
    }
  }

  render (state, refresh) {
    for (const nodeRender of this.renders) {
      nodeRender.render(state, refresh)
    }
  }
}
