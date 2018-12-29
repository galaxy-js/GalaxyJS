export default class GalaxyPlugin {

  /**
   * User's options
   *
   * @type {Object}
   */
  static $options = {}

  /**
   * Default options
   *
   * @type {Object}
   */
  static $defaults = {}

  /**
   * Hook for plugin initialization
   *
   * @type {Function}
   * @noop
   */
  static init (config) {
    // TODO: Initialize plugin
  }

  /**
   * Perform installation process
   *
   * @type {Function}
   * @noop
   */
  static install (GalaxyElement) {
    // TODO: Install process here
  }

  /**
   * Set options for plugin installation
   *
   * @param {Object} options
   *
   * @return {GalaxyPlugin}
   */
  static with (options) {
    Object.assign(this.$options, this.$defaults, options)

    return this
  }
}

/**
 * Utility for cache plugin instance on initialization
 *
 * @param {*} GalaxyPlugin
 *
 * @return void
 */
export function withCachedInstance (GalaxyPlugin) {
  const initiliaze = GalaxyPlugin.init

  GalaxyPlugin.init = function (config) {
    this.$instance = new GalaxyPlugin(this.$options)
    initiliaze.call(this, config)
  }

  return GalaxyPlugin
}
