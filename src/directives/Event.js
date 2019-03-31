import GalaxyDirective from '../core/GalaxyDirective.js'

import { isGalaxyElement } from '../utils/type-check.js'
import { newIsolated, mergeEventHandlers } from '../utils/generic.js'

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
    const { $args, $name, $element, $renderer } = this
    const once = $args.includes('once')
    const evaluate = this.$compiler.compileEvent(this.$value)

    // Merged handlers
    let mainHandler

    const handlers = []

    let attachMethod = 'addEventListener'

    if ($args.includes('self')) {
      handlers.push((next, $event) => {
        if ($event.target === $event.currentTarget) {
          next($event)
        }
      })
    }

    if ($args.includes('prevent')) {
      handlers.push((next, $event) => {
        $event.preventDefault()
        next($event)
      })
    }

    if (isGalaxyElement($element)) {
      attachMethod = `$on${once ? 'ce' : ''}`
    } else if (once) {
      handlers.push((next, $event) => {
        $element.removeEventListener($name, mainHandler)
        next($event)
      })
    }

    handlers.push((end, $event) => {
      evaluate(newIsolated($renderer.isolated, { $event }))
      end()
    })

    $element[attachMethod]($name, mainHandler = mergeEventHandlers(handlers))
  }
}
