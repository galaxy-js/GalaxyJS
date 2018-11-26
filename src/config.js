export default {

  /**
   * Main element
   *
   * @type {Array<GalaxyElement>}
   */
  root: null,

  /**
   * Debug mode
   *
   * @type {boolean}
   */
  debug: true,

  /**
   * Plugins to install
   *
   * @type {Array<Object|Function>}
   */
  plugins: {},

  /**
   * Filters holder
   *
   * @enum {Function}
   */
  filters: {},

  /**
   * Directives holder
   *
   * @type {Array<GalaxyDirective>}
   */
  directives: []
}
