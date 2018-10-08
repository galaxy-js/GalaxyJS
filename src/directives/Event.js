import GalaxyDirective from '../core/GalaxyDirective.js'

import { isGalaxyElement } from '../utils/type-check.js'

export default class EventDirective extends GalaxyDirective {
  static get is () {
    return '@<name>'
  }

  init () {
    const { $args, $scope, $name, $element } = this
    const once = $args.includes('once')

    let attachMethod = 'addEventListener'

    let actual
    let handler = event => {
      // Externalize event
      $scope.$event = event

      // TODO: Call $getter directly when rewriteMethods has been removed
      this.$getter()

      $scope.$event = null
    }

    if ($args.includes('self')) {
      actual = handler

      handler = event => {
        if (event.target === event.currentTarget) {
          actual(event)
        }
      }
    }

    if ($args.includes('prevent')) {
      actual = handler

      handler = event => {
        event.preventDefault()
        actual(event)
      }
    }

    if (isGalaxyElement($element)) {
      attachMethod = `$on${once ? 'ce' : ''}`
    } else if (once) {
      actual = handler

      handler = event => {
        $element.removeEventListener($name, handler)
        actual(event)
      }
    }

    $element[attachMethod]($name, handler)
  }
}
