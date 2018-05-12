import config from '../config.js'

/**
 * Exposed internally as Globals within the scope
 */
export default {

  /**
   *
   * @param {*} value
   * @param {Array.<Object>} filters
   *
   * @return {*}
   */
  _$f (value, filters) {
    return filters.reduce((result, filter) => {
      const applier = config.filters[filter.name]

      return filter.args
        ? applier(result, ...args)
        : applier(result)
    }, value)
  }
}
