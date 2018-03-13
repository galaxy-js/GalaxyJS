import RenderElement from './RenderElement.js'
import RenderNode from './RenderNode.js'

import { isElementNode } from '../utils/type-check.js'
import { isTextWithoutTemplate } from '../utils/evaluation.js'

/**
 * Renderer is to inline render objects
 * and avoid multiple and nested unecessary childs
 */
export default class Renderer {
  constructor (fragment, scope) {
    this.fragment = fragment
    this.scope = scope

    this.renders = []

    this.addRenders(fragment.childNodes)
  }

  addRenders (nodes) {
    for (const node of nodes) {
      if (!isTextWithoutTemplate(node)) {
        this.addRender(node)
      }
    }
  }

  addRender (node) {
    let render
    let isRenderable = true

    if (!isElementNode(node)) {
      render = new RenderNode(node)
    } else {
      render = new RenderElement(node, this.scope /* Simple scope inheritance */)
      isRenderable = render.attributeRenders.length > 0

      this.addRenders(node.childNodes)
    }

    if (isRenderable) {
      this.renders.push(render)
    }
  }

  render (state = this.scope.state, refresh) {
    for (const render of this.renders) {
      render.render(state, refresh)
    }
  }
}
