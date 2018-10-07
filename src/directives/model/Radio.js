import BindDirective from './Bind.js'

/**
 * Support for <input type="radio">
 */
export default class RadioDirective extends BindDirective {
  static match (_, { element }) {
    return element.type === 'radio'
  }

  onChange ({ target }) {
    if (target.checked) {
      this.setValue(target.value)
    }
  }

  update (radio, value) {
    radio.checked = String(value) === radio.value
  }
}
