import GalaxyDirective from '../core/GalaxyDirective.js'

export default class ReferenceDirective extends GalaxyDirective {
  static get is () {
    return 'ref'
  }

  init () {
    if (!this.$scope.$refs) {
      this.$scope.$refs = new Map()

      this.$scope.$on('$render:before', () => {
        this.$scope.$refs.clear()
      })
    }
  }

  render () {
    if (this.$element.isConnected) {
      this.$scope.$refs.set(this.$value, this.$element)
    }
  }
}
