import config from '../config.js'

import ProxyObserver from 'https://cdn.jsdelivr.net/gh/LosMaquios/ProxyObserver@v0.3.3/index.js'
import ChildrenRenderer from '../renderers/element/Children.js'

import nextTick from 'https://cdn.jsdelivr.net/gh/LosMaquios/next-tick@v0.1.0/index.js'
import { isObject, isFunction, isReserved } from '../utils/type-check.js'
import { callHook, ensureListeners } from '../utils/generic.js'

import GalaxyError, { galaxyError } from '../errors/GalaxyError.js'

/**
 * Internal
 */
const __proxies__ = new WeakMap()
const __observers__ = new WeakMap()

export default class GalaxyElement extends HTMLElement {
  constructor () {
    super()

    /**
     * State for data-binding
     *
     * @type {Object.<*>}
     * @public
     */
    this.state = {} // This already call initial render

    /**
     * Hold component properties
     *
     * @type {Object.<*>}
     * @public
     */
    this.props = this.constructor.properties // TODO: How to properly define properties?

    /**
     * Actual DOM event being dispatched
     *
     * @type {Event}
     * @public
     */
    this.$event = null

    /**
     * Attached events
     *
     * @type {Object.<Array>}
     * @public
     */
    this.$events = Object.create(null)

    /**
     * Give directly access to the parent galaxy element
     *
     * @type {GalaxyElement}
     * @public
     */
    this.$parent = null

    /**
     * Give access to children galaxy elements
     *
     * @type {Object.<GalaxyElement>}
     * @public
     */
    this.$children = {}

    /**
     * Hold element references
     *
     * @type {Map<string, HTMLElement>}
     * @public
     */
    this.$refs = new Map()

    const shadow = this.attachShadow({ mode: 'open' })

    if (this.constructor.style instanceof HTMLStyleElement) {

      // Prepend styles
      shadow.appendChild(this.constructor.style)
    }

    // We need to append content before setting up the main renderer
    shadow.appendChild(this.constructor.template.content.cloneNode(true))

    /**
     * Main renderer called for rendering
     *
     * @type {ChildrenRenderer}
     * @public
     */
    this.$renderer = new ChildrenRenderer(shadow.childNodes, this, {})

    /**
     * Determines whether we are in a rendering phase
     *
     * @type {boolean}
     * @public
     */
    this.$rendering = false

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
    const proxy = ProxyObserver.observe(state, {}, render)

    // Setup indexes
    __proxies__.set(this, proxy)
    __observers__.set(this, ProxyObserver.get(proxy))

    // State change, so render...
    render()
  }

  /**
   * Gets actual observer
   *
   * Warning: When the state changes also the observer changes
   */
  get $observer () {
    return __observers__.get(this)
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
   * Watch a given `path` from the state
   *
   * @param {string} path
   * @param {Function} watcher
   *
   * @return {Function}
   */
  $watch (path, watcher) {
    let $observer
    let dispatch

    let { state } = this
    const keys = path.split('.')

    keys.forEach((key, index) => {
      if (index !== keys.length - 1) {
        state = state[key]

        if (!state) throw new GalaxyError(`Wrong path at segment: '.${key}'`)
      } else {
        $observer = ProxyObserver.get(state)

        if (key === '*') {
          dispatch = change => {
            watcher(
              change.value, change.old,

              // We need to pass extra properties
              // for deep observing.
              change.property, change.target
            )
          }
        } else {
          dispatch = change => {
            if (change.property === key) {
              watcher(change.value, change.old)
            }
          }
        }
      }
    })

    if ($observer && dispatch) {
      $observer.subscribe(dispatch)

      return () => {
        $observer.unsubscribe(dispatch)
      }
    }
  }

  /**
   * Events
   *
   * Custom and native events API
   */
  $on (event, listener, useCapture) {
    (this.$events[event] = ensureListeners(this.$events, event)).push(listener)

    this.addEventListener(event, listener, useCapture)
  }

  $once (event, listener, useCapture) {

    // Once called wrapper
    const onceCalled = $event => {
      this.$off(event, onceCalled)
      listener($event)
    }

    // Reference to original listener
    onceCalled.listener = listener

    this.$on(event, onceCalled, useCapture)
  }

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
  }

  $emit (event, detail) {
    this.dispatchEvent(
      event instanceof Event
        ? event
        : new CustomEvent(event, { detail })
    )
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
