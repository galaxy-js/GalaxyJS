import { ensureListeners } from '../../utils/generic.js'

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
   * @param {boolean} [useCapture]
   *
   * @return void
   */
  $on (event, listener, useCapture) {
    (this.$events[event] = ensureListeners(this.$events, event)).push(listener)

    this.addEventListener(event, listener, useCapture)
  },

  /**
   * Attach a listener to be called once
   *
   * @param {string} event
   * @param {Function} listener
   * @param {boolean} [useCapture]
   *
   * @return void
   */
  $once (event, listener, useCapture) {

    // Once called wrapper
    const onceCalled = $event => {
      this.$off(event, onceCalled)
      listener($event)
    }

    // Reference to original listener
    onceCalled.listener = listener

    this.$on(event, onceCalled, useCapture)
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
        const alive = ensureListeners(this.$events, event).filter(_ => _ !== listener)

        if (alive.length) {
          this.$events[event] = alive
        } else {
          delete this.$events[event]
        }

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
