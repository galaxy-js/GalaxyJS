import BindingRenderer from './Binding.js'

import { isObject } from '../../../utils/type-check.js'

const CLASS_REGEX = /^:{1,2}class$/

export default class ClassRenderer extends BindingRenderer {
  static is ({ name }) {
    return CLASS_REGEX.test(name)
  }

  static getNormalized (value) {
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

  patch (attribute, value) {
    value = ClassRenderer.getNormalized(value)

    // Fallback to normal attribute patching
    if (!isObject(value)) return super.patch(attribute, value)

    const { classList } = this.owner

    for (const key in value) {
      if (value.hasOwnProperty(key)) {
        classList[value[key] ? 'add' : 'remove'](key)
      }
    }
  }
}
