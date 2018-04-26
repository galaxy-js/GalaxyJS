/**
 * Simple wrapper to handle
 * Galaxy elements digest cycle
 */
export default class RenderGalaxy {
  constructor (ce) {
    this.ce = ce
  }

  static is (element) {
    return !!element.__galaxy__
  }

  render () {
    // Resolve directive, props & attribute bindings
    this.ce.render()

    // Re-render (digest props)
    this.ce.element.$render()
  }
}
