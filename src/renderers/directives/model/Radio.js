import BindRenderer from './Bind.js'

/**
 * Support for <input type="radio">
 */
export default class RadioRenderer extends BindRenderer {
  static is ({ type }) {
    return type === 'radio'
  }

  onChange = ({ target }) => {
    if (target.checked) {
      this.setValue(target.value)
    }
  }

  update (radio, value) {
    radio.checked = String(value) === radio.value
  }
}
