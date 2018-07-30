import BindRenderer from './Bind.js'

import { differ } from '../../../utils/generic.js'

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
export default class InputRenderer extends BindRenderer {
  constructor (input, context) {
    super(input, context)

    this.conversor = input.type === 'number' ? Number : String
  }

  static is (element) {
    return (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
    )
  }

  // Change state (Input -> State)
  onInput = ({ target }) => {
    this.setValue(this.conversor(target.value))
  }

  update (input, value) {
    value = String(value)

    if (differ(input, value)) {
      input.value = value
    }
  }
}
