import BindRenderer from './Bind.js'

/**
 * Support for <input type="checkbox">
 */
export default class CheckboxRenderer extends BindRenderer {
  static is ({ type }) {
    return type === 'checkbox'
  }

  onChange ({ target }) {
    const values = this.getter()

    if (!Array.isArray(values)) {
      return this.setValue(target.checked)
    }

    BindRenderer.setMultiple(
      target.checked,
      target.value,
      values
    )
  }

  update (checkbox, value) {
    checkbox.checked = Boolean(value)
  }
}
