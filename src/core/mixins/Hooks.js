import { callHook } from '../../utils/generic.js'
import { isGalaxyElement } from '../../utils/type-check.js'

/**
 * Lifecycle hooks
 *
 * @mixin
 */
export default {

  /**
   *
   */
  connectedCallback () {
    let $parent = this

    do {
      $parent = $parent[$parent instanceof ShadowRoot ? 'host' : 'parentNode']
    } while ($parent && !isGalaxyElement($parent))

    // Set parent communication
    this.$parent = $parent

    callHook(this, 'attached')
  },

  /**
   *
   */
  disconnectedCallback () {
    // Cut-out parent communication
    this.$parent = null

    callHook(this, 'detached')
  },

  /**
   *
   * @param {*} name
   * @param {*} old
   * @param {*} value
   */
  attributeChangedCallback (name, old, value) {
    callHook(this, 'attribute', { name, old, value })
  }
}
