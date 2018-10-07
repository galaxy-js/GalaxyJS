import ElementRenderer from '../../renderers/element/Element.js'

import { newIsolated } from '../../utils/generic.js'
import { compileScopedGetter } from '../../compiler/index.js';

export default class ItemRenderer extends ElementRenderer {
  constructor (template, context, isolated) {
    super(
      template.cloneNode(true), context.scope,

      // Scope inheritance
      newIsolated(context.isolated, isolated)
    )

    const indexBy = compileScopedGetter(this.element.getAttribute('by'))

    // TODO: Reuse implementation from BaseRenderer
    this.by = isolated => {
      return indexBy(context.scope, Object.assign({}, this.isolated, isolated))
    }

    this.reused = false
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
