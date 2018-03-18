import config from '../config.js'

import RenderNode from './RenderNode.js'

import { isTextNode, isElementNode } from '../utils/type-check.js'
import { hasTemplate } from '../utils/evaluation.js'

import reference, { REFERENCE_ATTRIBUTE } from '../directives/reference.js'
import RenderBind, { BIND_ATTRIBUTE, BIND_TOKEN } from '../directives/RenderBind.js'
import RenderConditional, { CONDITIONAL_ATTRIBUTE } from '../directives/RenderConditional.js'
import event, { EVENT_TOKEN } from '../directives/event.js'

/**
 * Renderer is to inline render objects
 * and to avoid multiple and nested unecessary
 * render node childs
 */
export default class Renderer {
  constructor (scope) {
    // Set to root fragment
    this.scope = scope
    this.renders = []
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
      const { attributes } = node

      if (REFERENCE_ATTRIBUTE in attributes) {
        reference(node, this.scope)
      }

      if (BIND_ATTRIBUTE in attributes) {
        this.renders.push(new RenderBind(node, this.scope))
      }

      if (CONDITIONAL_ATTRIBUTE in attributes) {
        this.renders.push(new RenderConditional(node))
      }

      for (const attribute of attributes) {
        const { name } = attribute
        const isDirect = name.startsWith(BIND_TOKEN)

        if (isDirect || hasTemplate(attribute)) {
          const observed = document.createAttribute(name.slice(1))
          observed.value = attribute.value

          attributes.setNamedItem(observed)

          if (!config.debug) node.removeAttribute(name)

          this.renders.push(new RenderNode(observed, isDirect))
        } else if (name.startsWith(EVENT_TOKEN)) {
          event(node, name, this.scope)
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
