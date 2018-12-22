import nextTick from 'next-tick'

import config from '../config.js'

import ProxyObserver from 'proxy-observer'
import ChildrenRenderer from '../renderers/element/Children.js'

import EventsMixin from './mixins/Events.js'

import { isFunction, isReserved, isGalaxyElement } from '../utils/type-check.js'
import { callHook, getName, applyMixins } from '../utils/generic.js'

import GalaxyError, { galaxyError } from '../errors/GalaxyError.js'

/**
 * Internal
 */
const __proxies__ = new WeakMap()

/**
 * Creates a customized built-in element
 *
 * @param {HTMLElement} SuperElement
 *
 * @return {GalaxyElement}
 *
 * @api public
 */
export function extend (SuperElement) {

  class GalaxyElement extends SuperElement {

    /**
     * Hold element references
     *
     * @type {Object.<Element>}
     * @public
     */
    $refs = Object.create(null)

    /**
     * Attached events
     *
     * @type {Object.<Array>}
     * @public
     */
    $events = Object.create(null)

    /**
     * Give directly access to the parent galaxy element
     *
     * @type {GalaxyElement}
     * @public
     */
    $parent = null

    /**
     * Determines whether we are in a rendering phase
     *
     * @type {boolean}
     * @public
     */
    $rendering = false

    constructor () {
      super()

      let shadow
      const { style, template } = this.constructor

      try {
        shadow = this.attachShadow({ mode: 'open' })
      } catch (e) {
        /**
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow#Exceptions
         */
      }

      if (style instanceof HTMLStyleElement) {
        if (!shadow) throw new GalaxyError('style cannot be attached')

        // Prepend styles
        shadow.appendChild(style.cloneNode(true))
      }

      if (template instanceof HTMLTemplateElement) {
        if (!shadow) throw new GalaxyError('template cannot be attached')

        // We need to append content before setting up the main renderer
        shadow.appendChild(template.content.cloneNode(true))
      }

      /**
       * Custom element name
       *
       * @type {string}
       * @public
       */
      this.$name = getName(this.constructor)

      /**
       * State for data-binding
       *
       * @type {Object.<*>}
       * @public
       */
      this.state = {} // This performs the initial render

      /**
       * Main renderer
       *
       * @type {ChildrenRenderer}
       * @public
       */
      this.$renderer = new ChildrenRenderer(
        shadow ? shadow.childNodes : [],
        this, {}
      )

      // Call element initialization
      callHook(this, 'created')
    }

    get state () {
      // Return proxified state
      return __proxies__.get(this)
    }

    set state (state) {
      const render = () => { this.$render() }

      // Setup proxy to perform render on changes
      __proxies__.set(this, ProxyObserver.observe(
        state, null /* <- options */,
        render /* <- global subscription */
      ))

      // State change, so render...
      render()
    }

    /**
     * Lifecycle hooks
     *
     * Hooks that catch changes properly
     */
    connectedCallback () {
      let $parent = this

      do {
        $parent = $parent instanceof ShadowRoot ? $parent.host : $parent.parentNode
      } while ($parent && !isGalaxyElement($parent))

      // Set parent communication
      this.$parent = $parent

      callHook(this, 'attached')
    }

    disconnectedCallback () {
      // Cut-out parent communication
      this.$parent = null

      callHook(this, 'detached')
    }

    attributeChangedCallback (name, old, value) {
      callHook(this, 'attribute', { name, old, value })
    }

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
    }

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

  /**
   * Used internally
   * Simply to avoid: GalaxyElement.prototype.__proto__.[[constructor]]
   *
   * @type {boolean}
   */
  GalaxyElement.extendsBuiltIn = SuperElement !== HTMLElement

  /**
   * Is this element resolved?
   *
   * @type {boolean}
   */
  GalaxyElement.resolved = false

  /**
   * Mark (both constructor and __proto__) as GalaxyElement
   */
  GalaxyElement.prototype.$galaxy = GalaxyElement.$galaxy = true

  // Mix features
  applyMixins(GalaxyElement, [
    EventsMixin
  ])

  // Return mixed
  return GalaxyElement
}
