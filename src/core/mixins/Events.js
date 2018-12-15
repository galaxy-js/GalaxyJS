import { ensureListeners, removeListener } from '../../utils/generic.js'

/**
 * Events - Custom and native events API
 *
 * @mixin
 */
export default {

  /**
   * Attach a given listener to an event
   *
   * @param {string} event
   * @param {Function} listener
   * @param {Object|boolean} [options]
   *
   * @return void
   */
  $on (event, listener, options) {
    (this.$events[event] = ensureListeners(this.$events, event)).push(listener)

    this.addEventListener(event, listener, options)
  },

  /**
   * Attach a listener to be called once
   *
   * @param {string} event
   * @param {Function} listener
   * @param {Object|boolean} [options]
   *
   * @return void
   */
  $once (event, listener, options = {}) {
    if (typeof options === 'boolean') {
      options = { capture: options }
    }

    const onceCalled = $event => {
      removeListener(listener)
      listener.call(this, $event)
    }

    // Once called option
    options.once = true

    // Reference to original listener
    onceCalled.listener = listener

    this.$on(event, onceCalled, options)
  },

  /**
   * Detach a given listener from an event
   *
   * @param {string} event
   * @param {Function} listener
   *
   * @return void
   */
  $off (event, listener) {
    switch (arguments.length) {

      // .$off()
      case 0: for (event in this.$events) {
        this.$off(event)
      } break

      // .$off('event')
      case 1: for (const listener of ensureListeners(this.$events, event)) {
        this.$off(event, listener)
      } break

      // .$off('event', listener)
      default: {
        removeListener(this.$events, event, listener)
        this.removeEventListener(event, listener)
      }
    }
  },

  /**
   * Dispatch an event
   *
   * @param {Event|string} event
   * @param {*} [detail]
   *
   * @return void
   */
  $emit (event, detail) {
    this.dispatchEvent(
      event instanceof Event
        ? event
        : new CustomEvent(event, { detail })
    )
  }
}
