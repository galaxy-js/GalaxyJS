import RenderNode from './RenderNode.js'

import { isTextNode, isElementNode } from '../utils/type-check.js'
import { hasTemplate, attachEvent } from '../utils/evaluation.js'
import { camelize } from '../utils/generic.js'

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

  constructor (fragment, scope) {
    this.fragment = fragment
    this.scope = scope

    this.renders = []
    this.refs = {}

    this.addRenders(fragment.childNodes)
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
      if ('gRef' in node.dataset) {
        this.addRef(node)
      }

      for (const attribute of node.attributes) {
        const { name } = attribute
        const isDirect = name.startsWith(Renderer.BIND_INDICATOR)

        if (isDirect || hasTemplate(attribute)) {
          this.renders.push(new RenderNode(attribute, isDirect))
        } else if (name.startsWith(Renderer.EVENT_INDICATOR)) {
          attachEvent(node, attribute, this.scope)
        }
      }

      this.addRenders(node.childNodes)
    }
  }

  addRef (node) {
    this.refs[camelize(node.dataset.gRef)] = node
    node.removeAttribute('data-g-ref')
  }

  render (state, refresh) {
    for (const nodeRender of this.renders) {
      nodeRender.render(state, refresh)
    }
  }
}
