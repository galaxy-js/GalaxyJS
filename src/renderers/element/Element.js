import BaseRenderer from './Base.js'

/**
 * Import possible children
 */
import TemplateRenderer from '../Template.js'
import CustomRenderer from './Custom.js'

import LoopRenderer from '../directives/loop/Loop.js'

import { isTextNode, isElementNode } from '../../utils/type-check.js'
import { flatChildren } from '../../utils/generic.js'

export default class ElementRenderer extends BaseRenderer {
  constructor (...args) {
    super(...args)

    /**
     * Resolve children renders
     */
    this.children = []

    // Attach children
    this._initChildren()
  }

  get isRenderable () {
    return (
      this.directives.length > 0 ||
      this.bindings.length > 0 ||
      this.children.length > 0
    )
  }

  get isFlattenable () {
    return (
      this.children.length > 0 &&
      !this.directives.length &&
      !this.bindings.length
    )
  }

  _initChildren () {
    for (const child of this.element.childNodes) {

      // 1. Check {{ interpolation }}
      if (isTextNode(child) && TemplateRenderer.is(child)) {
        this.children.push(new TemplateRenderer(child, this))

      // 2. Element binding
      } else if (isElementNode(child)) {

        // The loop directive is resolved as a child
        if (LoopRenderer.is(child)) {
          this.children.push(new LoopRenderer(child, this))
        } else if (CustomRenderer.is(child))  {

          // Set parent communication
          // TODO: Logic within RenderCE?
          child.$parent = this.scope

          this.children.push(new CustomRenderer(child, this.scope, this.isolated))
        } else {
          const element = new ElementRenderer(child, this.scope, this.isolated)

          // Only consider a render element if its childs
          // or attributes has something to bind/update
          if (element.isRenderable) {
            this.children.push(...(element.isFlattenable ? flatChildren(element) : [element]))
          }
        }
      }

      // ... ignore comment nodes
    }
  }

  render () {
    // Resolve directives & attribute bindings
    super.render()

    // Don't perform updates on disconnected element
    if (this.element.isConnected) {
      for (const child of this.children) {
        child.render()
      }
    }
  }
}
