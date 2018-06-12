import BindRenderer from './Bind.js'

import GalaxyError from '../../../errors/GalaxyError.js'

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
    let values

    if (this.multiple) {
      values = this.value

      if (!Array.isArray(values)) {
        throw new GalaxyError(
          'Invalid bound value. ' +
          '*bind directive on select elements with the multiple attribute must have an array bound value.'
        )
      }
    }

    for (const { value, selected } of target.options) {
      if (selected) {
        if (!this.multiple) {

          // In non-multiple select we need to set
          // the raw value since there's no reference
          return this.setValue(value)
        } else if (values.indexOf(value) === -1) {
          values.push(value)
        }
      } else if (this.multiple) {
        const index = values.indexOf(value)

        if (index > -1) {
          values.splice(index, 1)
        }
      }
    }
  }

  render () {
    if (this.setting) {
      this.setting = false
      return
    }

    const { value } = this

    for (const option of this.target.options) {
      option.selected = this.multiple
        ? value.indexOf(option.value) > -1
        : value === option.value
    }
  }
}
