import BindDirective from './Bind.js'

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

    this.valueKey = 'value'

    switch (this.$args[0]) {
      case 'number': this.valueKey += 'AsNumber'; break
      case 'date': this.valueKey += 'AsDate'; break
    }
  }

  // Change state (Input -> State)
  onInput ({ target }) {
    this.setValue(target[this.valueKey])
  }

  update (input, value) {
    if (input[this.valueKey] !== value) {
      input[this.valueKey] = value
    }
  }
}
