import BaseRenderer from '../../Base.js'

import { getAttr } from '../../../utils/generic.js'
import { compileScopedSetter } from '../../../compiler/index.js'

const BIND_DIRECTIVE = '*bind'

export default class BindRenderer extends BaseRenderer {
  constructor (target, context) {
    super(
      target, context,
      getAttr(target, BIND_DIRECTIVE)
    )

    this.setting = false

    // Input -> State
    const setter = compileScopedSetter(this.expression)

    this.setter = value => {
      setter(
        // (scope, locals
        context.scope, context.isolated,

        // ...args[0])
        value
      )
    }

    if (this.onInput) {
      target.addEventListener('input', this.onInput.bind(this))
    }

    if (this.onChange) {
      target.addEventListener('change', this.onChange.bind(this))
    }
  }

  static is ({ attributes }) {
    return BIND_DIRECTIVE in attributes
  }

  setValue (value) {
    this.setting = true
    this.setter(value)
  }

  patch (target, value) {
    // Avoid re-dispatching render on updated values
    if (this.setting) {
      this.setting = false
    } else {
      this.update(target, value)
    }
  }
}
