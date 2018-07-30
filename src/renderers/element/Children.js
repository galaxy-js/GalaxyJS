import config from '../../config.js'

import TemplateRenderer from '../Template.js'
import ElementRenderer from './Element.js'
import VoidRenderer from './Void.js'
import { CustomRenderer, CustomVoidRenderer } from './Custom.js'

import LoopRenderer from '../directives/loop/Loop.js'

import { isTextNode, isElementNode, isGalaxyElement } from '../../utils/type-check.js'
import { flatChildren } from '../../utils/generic.js'

const SKIP_ATTRIBUTE = 'skip'

export default class ChildrenRenderer {
  constructor (children, scope, isolated) {
    this.children = Array.from(children)
    this.scope = scope
    this.isolated = isolated

    /**
     * Resolve children renderers
     */
    this.renderers = []

    // Attach children
    this._initChildren()
  }

  _initChildren () {
    for (const child of this.children) {

      // 1. Check {{ interpolation }}
      if (isTextNode(child) && TemplateRenderer.is(child)) {
        this.renderers.push(new TemplateRenderer(child, this))

      // 2. Element binding
      } else if (isElementNode(child)) {

        if (child.hasAttribute(SKIP_ATTRIBUTE)) {
          if (!config.debug) {
            child.removeAttribute(SKIP_ATTRIBUTE)
          }

          // Skip construction/compilation phase
          continue
        }

        // The loop directive is resolved as a child
        if (LoopRenderer.is(child)) {
          this.renderers.push(new LoopRenderer(child, this))
        } else if (isGalaxyElement(child))  {
          this.renderers.push(new (
            VoidRenderer.is(child)
              ? CustomVoidRenderer
              : CustomRenderer)(child, this.scope, this.isolated))
        } else {
          const element = new (
            VoidRenderer.is(child)
              ? VoidRenderer
              : ElementRenderer)(child, this.scope, this.isolated)

          // Only consider a render element if its childs
          // or attributes has something to bind/update
          if (element.isRenderable) {
            this.renderers.push(...(element.isFlattenable ? flatChildren(element) : [element]))
          }
        }
      }

      // ... ignore comment nodes
    }
  }

  render () {
    for (const renderer of this.renderers) {
      renderer.render()
    }
  }
}
