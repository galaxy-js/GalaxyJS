import BindDirective from './Bind.js'

import GalaxyError from '../../errors/GalaxyError.js'

/**
 * Support for single and multiple <select>
 */
export default class SelectDirective extends BindDirective {
  static match (_, { element }) {
    return element instanceof HTMLSelectElement
  }

  // TODO: There are some rendering quirks, fix that!

  onChange ({ target }) {
    const { options, multiple } = target

    if (!multiple) {
      for (const { value, selected } of options) {

        // In non-multiple select we need to set
        // the raw value since there's no reference
        if (selected) return this.setValue(value)
      }
    } else {
      const values = this.$getter()

      if (!Array.isArray(values)) {
        throw new GalaxyError(
          'Invalid bound value. ' +
          '*bind directive on select elements with a `multiple` attribute must have an array bound value.'
        )
      }

      for (const option of options) {
        BindDirective.setMultiple(
          option.selected,
          option.value,
          values
        )
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
