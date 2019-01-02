export default {

  /**
   * Main element
   *
   * @type {GalaxyElement}
   */
  root: null,

  /**
   * Debug mode
   *
   * @type {boolean}
   */
  debug: true,

  /**
   * Additional elements to register at root level
   *
   * Note: commonly used by plugins
   *
   * @type {Array<GalaxyElement>}
   */
  elements: [],

  /**
   * Directives holder
   *
   * @type {Array<GalaxyDirective>}
   */
  directives: [],

  /**
   * Plugins to install
   *
   * @type {Array<GalaxyPlugin>}
   */
  plugins: [],

  /**
   * Filters holder
   *
   * @enum {Object.<Function>}
   */
  filters: {}
}
