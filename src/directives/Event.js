import GalaxyDirective from '../core/GalaxyDirective.js'

import { compileEvent } from '../compiler/index.js'
import { isGalaxyElement } from '../utils/type-check.js'
import { newIsolated } from '../utils/generic.js'

export default class EventDirective extends GalaxyDirective {
  static get is () {
    return '@<name>'
  }

  static get options () {
    return {
      $plain: true,
      $render: false
    }
  }

  init () {
    const { $args, $scope, $name, $element, $renderer } = this
    const once = $args.includes('once')
    const evaluate = compileEvent(this.$value)

    let attachMethod = 'addEventListener'

    let actual
    let handler = $event => {
      evaluate($scope, newIsolated($renderer.isolated, { $event }))
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
