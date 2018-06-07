import BindRenderer from './Bind.js'

const { forEach } = Array.prototype

/**
 * Support for single and multiple <select>
 */
export default class SelectRenderer extends BindRenderer {
  static is (element) {
    return element instanceof HTMLSelectElement
  }

  get multiple () {
    return this.target.multiple
  }

  onChange ({ target }) {
    let value = this.multiple ? [] : null

    forEach.call(target.options, option => {
      if (option.selected) {
        if (this.multiple) {
          value.push(option.value)
        } else {
          value = option.value
        }
      }
    })

    this.setValue(value)
  }

  render () {
    if (this.setting) {
      this.setting = false
      return
    }

    const { value } = this

    forEach.call(this.target.options, option => {
      option.selected = this.multiple
        ? value.indexOf(option.value) > -1
        : value === option.value
    })
  }
}
