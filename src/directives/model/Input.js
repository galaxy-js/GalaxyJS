import BindDirective from './Bind.js'

import { differ } from '../../utils/generic.js'

/**
 * With support just for input types:
 *
 *   - Password
 *   - Text
 *   - Email
 *   - Search
 *   - URL
 *   - Number
 *
 * And <textarea>
 */
export default class InputDirective extends BindDirective {
  static match (_, { element }) {
    return (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
    )
  }

  init () {
    super.init()

    // TODO: Check conversors
    this.conversor = this.$element.type === 'number' ? Number : String
  }

  // Change state (Input -> State)
  onInput ({ target }) {
    this.setValue(this.conversor(target.value))
  }

  update (input, value) {
    value = String(value)

    if (differ(input, value)) {
      input.value = value
    }
  }
}
