import ElementRenderer from '../../renderers/element/Element.js'

import { newIsolated } from '../../utils/generic.js'
import { getIndexByFn } from './shared.js'

export default class ItemRenderer extends ElementRenderer {
  constructor (template, renderer, isolated) {
    super(
      template.cloneNode(true), renderer.scope,

      // Scope inheritance
      newIsolated(renderer.isolated, isolated)
    )

    this.by = getIndexByFn(this.element)
    this.reused = false
  }

  get children () {
    return this.childrenRenderer.children
  }

  get key () {
    return this.by()
  }

  get next () {
    return (this.isPlaceholder ? this.children[this.children.length - 1] : this.element).nextSibling
  }

  update (isolated) {
    this.reused = true

    Object.assign(this.isolated, isolated)
  }

  insert (node) {
    node.before(...(this.isPlaceholder ? this.children : [this.element]))
  }

  remove () {
    if (this.isPlaceholder) {
      this.children.forEach(child => child.remove())
    } else {
      this.element.remove()
    }
  }
}
