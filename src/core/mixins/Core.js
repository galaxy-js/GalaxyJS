import nextTick from 'next-tick'

import config from '../../config.js'

import { isFunction, isReserved } from '../../utils/type-check.js'

import GalaxyError, { galaxyError } from '../../errors/GalaxyError.js'

/**
 * Core GalaxyElement API
 *
 * @mixin
 */
export default {

  /**
   * Filter a given `value`
   *
   * @param {string} name
   * @param {*} value
   * @param  {...*} args
   *
   * @return {*}
   */
  $filter (name, value, ...args) {
    const filter = config.filters[name]

    if (!filter) {
      throw new GalaxyError(`Unknown filter '${name}'`)
    }

    return filter(value, ...args)
  },

  /**
   * Intercept given method call by passing the state
   *
   * @param {string} method - Method name
   * @param {*...} [args] - Arguments to pass in
   *
   * @throws {GalaxyError}
   *
   * @return void
   */
  $commit (method, ...args) {
    if (method in this) {
      if (!isFunction(this[method])) {
        throw new GalaxyError(`Method '${method}' must be a function`)
      }

      if (isReserved(method)) {
        throw new GalaxyError(`Could no call reserved method '${method}'`)
      }

      this[method](this.state, ...args)
    }
  },

  /**
   * Execute given `callback` after render new view changes
   *
   * @param {Function} callback
   *
   * @return {Promise|void}
   */
  $afterRender (callback) {
    nextTick(() => {
      if (this.$rendering) {
        return this.$afterRender(callback)
      }

      callback.call(this)
    })

    if (!callback) {
      return new Promise(resolve => {
        callback = resolve
      })
    }
  },

  /**
   * Reflect state changes to the DOM
   *
   * @return void
   */
  $render () {
    if (!this.$rendering) {
      this.$emit('$render:before')

      this.$rendering = true

      nextTick(() => {

        // Takes render error
        let renderError

        try {
          this.$renderer.render()
        } catch (e) {
          if (!(e instanceof GalaxyError)) {
            e = galaxyError(e)
          }

          // Don't handle the error in debug mode
          if (config.debug) throw e

          renderError = e
        }

        // Sleep after render new changes
        this.$rendering = false

        if (renderError) {

          // Event syntax: {phase}:{subject}
          this.$emit('$render:error', renderError)
        }
      })
    }
  }
}
