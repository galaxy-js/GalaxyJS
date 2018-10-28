import ElementRenderer from '../../renderers/element/Element.js'

import { newIsolated } from '../../utils/generic.js'
import { compileExpression } from '../../compiler/index.js'

export default class ItemRenderer extends ElementRenderer {
  constructor (template, renderer, isolated) {
    super(
      template.cloneNode(true), renderer.scope,

      // Scope inheritance
      newIsolated(renderer.isolated, isolated)
    )

    this.reused = false

    const indexBy = compileExpression(this.element.getAttribute('by'))

    this.by = isolated => {
      return indexBy(this.scope, newIsolated(this.isolated, isolated))
    }
  }

  get key () {
    return this.by()
  }

  get next () {
    return this.element.nextSibling
  }

  update (isolated) {
    this.reused = true

    Object.assign(this.isolated, isolated)
  }

  insert (item) {
    item.before(this.element)
  }

  remove () {
    this.element.remove()
  }
}
