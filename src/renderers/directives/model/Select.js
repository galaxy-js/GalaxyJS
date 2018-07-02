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
    const { options, multiple } = target

    if (!multiple) {
      for (const { value, selected } of options) {

        // In non-multiple select we need to set
        // the raw value since there's no reference
        if (selected) return this.setValue(value)
      }
    } else {
      const values = this.value

      if (!Array.isArray(values)) {
        throw new GalaxyError(
          'Invalid bound value. ' +
          '*bind directive on select elements with a `multiple` attribute must have an array bound value.'
        )
      }

      for (const { value, selected } of options) {
        const index = values.indexOf(value)

        if (selected) {
          if (index === -1) values.push(value)
        } else if (index > -1) {
          values.splice(index, 1)
        }
      }
    }
  }

  update (select, value) {
    for (const option of select.options) {
      option.selected = select.multiple
        ? value.indexOf(option.value) > -1
        : value === option.value
    }
  }
}
