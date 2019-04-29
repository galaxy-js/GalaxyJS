import ElementRenderer from '../../renderers/element/Element.js'

import { newIsolated, dispatchTransitionEvent } from '../../utils/generic.js'

export default class ItemRenderer extends ElementRenderer {
  constructor (template, renderer, isolated) {
    super(
      template.cloneNode(true), renderer.scope,

      // Scope inheritance
      newIsolated(renderer.isolated, isolated)
    )

    const indexBy = this.scope.$compiler.compileExpression(this.element.getAttribute('by'))

    this.by = locals => indexBy(newIsolated(this.isolated, locals))
    this.updated = false
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
    Object.assign(this.isolated, isolated)

    // Mark as updated for item recycling
    this.updated = true
  }

  insert (node, transitionType) {
    if (!this.isPlaceholder) {
      const performInsert = () => node.before(this.element)

      return transitionType
        ? this._dispatchTransitionEvent(transitionType, this.element, performInsert)
        : performInsert()
    }

    const performInsert = child => node.before(child)

    this.children.forEach(child => {
      if (transitionType) {
        this._dispatchTransitionEvent(transitionType, this.element, () => performInsert(child))
      } else {
        performInsert(child)
      }
    })
  }

  remove () {
    if (this.isPlaceholder) {
      return this.children.forEach(child => {
        this._dispatchTransitionEvent('leave', this.element, () => child.remove())
      })
    }

    this._dispatchTransitionEvent('leave', this.element, () => {
      this.element.remove()
    })
  }

  _dispatchTransitionEvent (type, target, transitionCb) {
    dispatchTransitionEvent(this.element, `for:${type}`, target, transitionCb)
  }
}
