import { callHook } from '../../utils/generic.js'
import { isGalaxyElement } from '../../utils/type-check.js'

/**
 * Lifecycle hooks
 *
 * @mixin
 */
export default {

  /**
   * Called when the element gets instantiated
   *
   * @return void
   */
  onCreated () {},

  /**
   * Called when the element is attached to a document/ShadowRoot
   *
   * @return void
   */
  onAttached () {},
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
   * Called when the element is detached from a document/ShadowRoot
   *
   * @return void
   */
  onDetached () {},
  disconnectedCallback () {
    // Cut-out parent communication
    this.$parent = null

    callHook(this, 'detached')
  },

  /**
   * Intercept attribute change value
   *
   * @param {Object} attribute
   *
   * @return void
   */
  onAttribute (attribute) {},
  attributeChangedCallback (name, old, value) {
    callHook(this, 'attribute', { name, old, value })
  }
}
