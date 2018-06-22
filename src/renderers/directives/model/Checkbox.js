import BindRenderer from './Bind.js'

/**
 * Support for <input type="checkbox">
 */
export default class CheckboxRenderer extends BindRenderer {
  static is ({ type }) {
    return type === 'checkbox'
  }

  onChange ({ target }) {
    this.setValue(target.checked)
  }

  update (checkbox, value) {
    checkbox.checked = Boolean(value)
  }
}
