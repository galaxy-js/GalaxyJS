import config from '../config.js'

import { isDefined } from '../utils/type-check.js'

/**
 * Exposed internally as Globals within the scope
 */
export default {

  /**
   * Apply filter descriptors to the given `value`
   *
   * @param {*} value
   * @param {Array<Object>} filters
   *
   * @return {*}
   */
  _$f (value, filters) {
    return filters.reduce((result, filter) => {
      const applier = config.filters[filter.name]

      return filter.args
        ? applier(result, ...filter.args)
        : applier(result)
    }, value)
  },

  /**
   * Normalize given template value
   *
   * @param {*} value
   *
   * @return {string}
   */
  _$n (value) {
    return isDefined(value) ? value : ''
  }
}
