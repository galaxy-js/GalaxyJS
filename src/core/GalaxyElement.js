import config from '../config.js'

import ProxyObserver from 'https://cdn.jsdelivr.net/gh/LosMaquios/ProxyObserver@v0.3.3/index.js'
import ChildrenRenderer from '../renderers/element/Children.js'

import nextTick from 'https://cdn.jsdelivr.net/gh/LosMaquios/next-tick@v0.1.0/index.js'
import { isFunction, isReserved } from '../utils/type-check.js'
import { callHook } from '../utils/generic.js'

import GalaxyError, { galaxyError } from '../errors/GalaxyError.js'

/**
 * Internal
 */
const __proxies__ = new WeakMap()

export default class GalaxyElement extends HTMLElement {

  /**
   * Actual DOM event being dispatched
   *
   * @type {Event}
   * @public
   */
  $event = null

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
   * Give access to children galaxy elements
   *
   * @type {Object.<GalaxyElement>}
   * @public
   */
  $children = {}

  /**
   * Hold element references
   *
   * @type {Map<string, HTMLElement>}
   * @public
   */
  $refs = new Map()

  /**
   * Determines whether we are in a rendering phase
   *
   * @type {boolean}
   * @public
   */
  $rendering = false

  constructor () {
    super()

    const { style, template } = this.constructor
    const shadow = this.attachShadow({ mode: 'open' })

    if (style instanceof HTMLStyleElement) {

      // Prepend styles
      shadow.appendChild(style)
    }

    if (template instanceof HTMLTemplateElement) {

      // We need to append content before setting up the main renderer
      shadow.appendChild(template.content.cloneNode(true))
    }

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
    this.$renderer = new ChildrenRenderer(shadow.childNodes, this, {})

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
    callHook(this, 'attached')
  }

  disconnectedCallback () {
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
      this.$rendering = true

      nextTick(() => {

        // Takes render error
        let renderError

        // References are cleared before each render phase
        // then they going to be filled up
        this.$refs.clear()

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
