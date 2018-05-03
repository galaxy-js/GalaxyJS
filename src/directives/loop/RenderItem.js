import RenderElement from '../../core/RenderElement.js'

import { newIsolated } from '../../utils/generic.js'

export default class RenderItem {
  constructor (template, context, isolated) {
    this.child = new RenderElement(
      template.cloneNode(true),
      context.scope,
      newIsolated(context.isolated, isolated)
    )

    this.reused = false
  }

  update (isolated) {
    this.reused = true

    Object.assign(this.child.isolated, isolated)
  }

  insert (item) {
    item.parentNode.insertBefore(this.child.element, item)
  }

  render () {
    this.child.render()
  }
}
