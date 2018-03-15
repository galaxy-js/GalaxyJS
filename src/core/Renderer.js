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

  // data-g-ref
  static get REF_INDICATOR () {
    return 'gRef'
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
      if (Renderer.REF_INDICATOR in node.dataset) {
        this.addRef(node)
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
          attachEvent(node, attribute, this.scope)
        }
      }

      this.addRenders(node.childNodes)
    }
  }

  addRef (node) {
    this.scope.$refs[camelize(node.dataset[Renderer.REF_INDICATOR])] = node
    delete node.dataset[Renderer.REF_INDICATOR]
  }

  render (state, refresh) {
    for (const nodeRender of this.renders) {
      nodeRender.render(state, refresh)
    }
  }
}
