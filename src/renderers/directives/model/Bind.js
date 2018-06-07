import { getAttr } from '../../../utils/generic.js'
import { compileScopedSetter, compileScopedGetter } from '../../../compiler/index.js'

const BIND_ATTRIBUTE = '*bind'

export default class BindRenderer {
  constructor (target, context) {
    this.target = target
    this.context = context

    this.path = getAttr(target, BIND_ATTRIBUTE)

    this.setting = false

    // Input -> State
    this.setter = compileScopedSetter(this.path, context)

    // State -> Input
    this.getter = compileScopedGetter(this.path, context)

    if (this.onInput) {
      target.addEventListener('input', this.onInput.bind(this))
    }

    if (this.onChange) {
      target.addEventListener('change', this.onChange.bind(this))
    }
  }

  static is ({ attributes }) {
    return BIND_ATTRIBUTE in attributes
  }

  get value () {
    return this.getter()
  }

  setValue (value) {
    this.setting = true
    this.setter(value)
  }
}
