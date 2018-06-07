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
  onInput ({ target }) {
    this.setValue(this.conversor(target.value))
  }

  // Change input (State -> Input)
  render () {
    // Avoid re-dispatching on flush cycle
    // for an already assigned value
    if (this.setting) {
      this.setting = false
      return
    }

    const value = String(this.value)

    if (differ(this.target, value)) {
      this.target.value = value
    }
  }
}