import AbstractRender from './AbstractRender.js'

/**
 * Import possible children
 */
import RenderTemplate from '../core/RenderTemplate.js'
import RenderHTML from './RenderHTML.js'
import RenderCE from './RenderCE.js'
import RenderLoop from '../directives/loop/RenderLoop.js'

import { isTextNode, isElementNode } from '../utils/type-check.js'
import { flatChildren } from '../utils/generic.js'

export default class RenderElement extends AbstractRender {
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
        } else if (RenderCE.is(child))  {
          // Set parent communication
          // TODO: Logic within RenderCE?
          child.$parent = this.scope

          this.children.push(new RenderCE(child, this.scope, this.isolated))
        } else {
          const element = new RenderElement(child, this.scope, this.isolated)

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
