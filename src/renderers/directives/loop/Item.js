import ElementRenderer from '../../element/Element.js'

import { newIsolated } from '../../../utils/generic.js'

export default class ItemRenderer {
  constructor (template, context, isolated) {
    this.child = new ElementRenderer(
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
