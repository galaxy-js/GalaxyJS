import RenderBinding from '../core/RenderBinding.js'

import { isObject } from '../utils/type-check.js'

const CLASS_REGEX = /^:{0,2}class$/

export default class RenderClass extends RenderBinding {
  constructor (...args) {
    super(...args)
  }

  static is ({ name, value }) {
    return (
      CLASS_REGEX.test(name) &&

      // TODO: Check edge cases
      value.startsWith('{') ||
      value.startsWith('[')
    )
  }

  _getNormalized () {
    let result = {}
    const value = this.getter()

    if (!Array.isArray(value)) {
      result = value
    } else {
      value.forEach(item => {
        if (isObject(item)) {
          Object.assign(result, item)
        } else {
          result[item] = 1
        }
      })
    }

    return result
  }

  render () {
    const object = this._getNormalized()
    const { classList } = this.attribute.ownerElement

    for (const key in object) {
      if (object.hasOwnProperty(key)) {
        classList[object[key] ? 'add' : 'remove'](key)
      }
    }
  }
}
