import BindRenderer from './Bind.js'

import GalaxyError from '../../../errors/GalaxyError.js'

/**
 * Support for single and multiple <select>
 */
export default class SelectRenderer extends BindRenderer {
  static is (element) {
    return element instanceof HTMLSelectElement
  }

  onChange ({ target }) {
    let values
    const multiple = this.target.multiple

    if (multiple) {
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
        if (!multiple) {

          // In non-multiple select we need to set
          // the raw value since there's no reference
          return this.setValue(value)
        } else if (!values.includes(value)) {
          values.push(value)
        }
      } else if (multiple) {
        const index = values.indexOf(value)

        if (index > -1) {
          values.splice(index, 1)
        }
      }
    }
  }

  _render () {
    const { value } = this

    for (const option of this.target.options) {
      option.selected = this.target.multiple
        ? value.indexOf(option.value) > -1
        : value === option.value
    }
  }
}
