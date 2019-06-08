import VoidRenderer from './Void.js'
import ChildrenRenderer from './Children.js'

import { newIsolated } from '../../utils/generic.js'

export default class ElementRenderer extends VoidRenderer {
  constructor (element, scope, isolated) {
    super(element, scope, newIsolated(isolated))

    /**
     * Resolve children rendering
     */
    this.childrenRenderer = new ChildrenRenderer((this.isPlaceholder ? element.content : element).childNodes, scope, this.isolated)
  }

  get isRenderable () {
    return (
      super.isRenderable ||
      this.childrenRenderer.renderers.length > 0
    )
  }

  get isFlattenable () {
    return (
      this.childrenRenderer.renderers.length > 0 &&
      !this.directives.length
    )
  }

  callDirectiveHook (hook) {
    // Call children hooks before
    this.childrenRenderer.callDirectiveHook(hook)

    for (const directive of this.directives) {
      directive[hook]()
    }
  }

  render () {
    // Render directives
    super.render()

    // Render correctly on conditional flow
    if (this.isPlaceholder || this.element.isConnected) {

      // Render children
      this.childrenRenderer.render()
    }
  }
}
