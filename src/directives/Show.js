import GalaxyDirective from '../core/GalaxyDirective'

import { dispatchTransitionEvent } from '../utils/generic'

export default class ShowDirective extends GalaxyDirective {
  static get is () {
    return '*show'
  }

  init () {
    this.$style = this.$element.attributeStyleMap
    this.initialDisplay = this.$style.get('display')
  }

  render () {
    if (this.$getter()) {
      this._dispatchTransitionEvent('show', () => {
        this.$style[this.initialDisplay ? 'set' : 'delete']('display', this.initialDisplay)
      })
    } else {
      this._dispatchTransitionEvent('hide', () => {
        this.$style.set('display', 'none')
      })
    }
  }

  _dispatchTransitionEvent (type, transitionCb) {
    dispatchTransitionEvent(this.$element, `show:${type}`, this.$element, transitionCb)
  }
}
