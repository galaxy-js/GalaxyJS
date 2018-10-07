import BindingDirective from './Binding.js'

import { isObject } from '../../utils/type-check.js'

// TODO: Support single-class binding eg. :class.show="!hidden" and multiple :class.a.b="addBoth"

export default class ClassDirective extends BindingDirective {
  static get is () {
    return ':class'
  }

  _getNormalized () {
    const value = this.$getter()

    if (!Array.isArray(value)) return value

    const normalized = {}

    value.forEach(item => {
      if (isObject(item)) {
        Object.assign(result, item)
      } else {
        result[item] = 1
      }
    })

    return normalized
  }

  render () {
    const value = this._getNormalized()

    // Fallback to normal attribute patching
    if (!isObject(value)) return super.render()

    for (const key in value) {
      if (value.hasOwnProperty(key)) {
        this.$element.classList[value[key] ? 'add' : 'remove'](key)
      }
    }
  }
}
