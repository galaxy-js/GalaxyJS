import { isDefined } from '../../utils/type-check.js'

/**
 * Private methods
 *
 * @mixin
 */
export default {

  /**
   * Normalize given template value
   *
   * @param {*} value
   *
   * @return {string}
   */
  __$n (value) {
    return isDefined(value) ? value : ''
  }
}
