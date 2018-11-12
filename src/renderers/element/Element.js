import VoidRenderer from './Void.js'
import ChildrenRenderer from './Children.js'

import { newIsolated } from '../../utils/generic.js'

export default class ElementRenderer extends VoidRenderer {
  constructor (element, scope, isolated) {
    super(element, scope, newIsolated(isolated))

    /**
     * Resolve children rendering
     */
    this.childrenRenderer = new ChildrenRenderer(element.childNodes, scope, this.isolated)
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

  render () {
    // Render directives
    super.render()

    // Render correctly on conditional flow
    if (this.element.isConnected) {

      // Render children
      this.childrenRenderer.render()
    }
  }
}
