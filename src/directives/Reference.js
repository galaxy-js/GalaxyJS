import GalaxyDirective from '../core/GalaxyDirective.js'

export default class ReferenceDirective extends GalaxyDirective {
  static get is () {
    return 'ref'
  }

  render () {
    const { $scope, $element, $value } = this

    if ($element.isConnected) {
      $scope.$refs[$value] = $element
    } else {
      delete $scope.$refs[$value]
    }
  }
}
