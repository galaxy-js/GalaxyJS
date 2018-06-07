import BindRenderer from './Bind.js'

/**
 * Support for <input type="radio">
 */
export default class RadioRenderer extends BindRenderer {
  static is ({ type }) {
    return type === 'radio'
  }

  onChange ({ target }) {
    if (target.checked) {
      this.setValue(target.value)
    }
  }

  render () {
    if (this.setting) {
      this.setting = false
      return
    }

    this.target.checked = String(this.value) === this.target.value
  }
}
