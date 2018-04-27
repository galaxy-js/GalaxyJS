import RenderBinding from '../core/RenderBinding.js'

import { isObject } from '../utils/type-check.js'

const CLASS_REGEX = /^:{1,2}class$/

export default class RenderClass extends RenderBinding {
  constructor (...args) {
    super(...args)
  }

  static is ({ name }) {
    return CLASS_REGEX.test(name)
  }

  _getNormalized () {
    const value = this.getter()

    if (!Array.isArray(value)) return value

    const result = {}

    value.forEach(item => {
      if (isObject(item)) {
        Object.assign(result, item)
      } else {
        result[item] = 1
      }
    })

    return result
  }

  render () {
    const value = this._getNormalized()

    // Fallback to normal attribute rendering
    if (!isObject(value)) return super.render()

    const { classList } = this.attribute.ownerElement

    for (const key in value) {
      if (value.hasOwnProperty(key)) {
        classList[value[key] ? 'add' : 'remove'](key)
      }
    }
  }
}
