import GalaxyDirective from '../core/GalaxyDirective.js'
import { camelize } from '../utils/generic.js'

export default class ReferenceDirective extends GalaxyDirective {
  static get is () {
    return 'ref'
  }

  init () {
    this.refName = camelize(this.$value)
  }

  render () {
    const { $scope, $element, refName } = this

    if ($element.isConnected) {
      $scope.$refs[refName] = $element
    } else {
      delete $scope.$refs[refName]
    }
  }
}
