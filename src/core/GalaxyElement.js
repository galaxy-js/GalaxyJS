import config from '../config.js'

import ProxyObserver from 'https://cdn.jsdelivr.net/gh/LosMaquios/ProxyObserver@v0.3.2/index.js'
import ElementRenderer from '../renderers/element/Element.js'

import nextTick from 'https://cdn.jsdelivr.net/gh/LosMaquios/next-tick@v0.1.0/index.js'
import { isObject, isFunction, isReserved } from '../utils/type-check.js'
import { callHook, ensureListeners } from '../utils/generic.js'

import GalaxyError from '../errors/GalaxyError.js'

import { ELEMENT_SYMBOL, STATE_SYMBOL } from './symbols.js'

export default class GalaxyElement extends HTMLElement {
  constructor () {
    super()

    // Default initial state
    // Just an empty object
    // Note: This also calls initial render
    this.state = {}

    // Hold component properties
    // TODO: How to properly define properties?
    this.props = this.constructor.properties

    // Actual DOM event being dispatched
    this.$event = null

    // Attached events
    this.$events = {}

    // For parent communication
    this.$parent = null

    // Hold element references
    this.$refs = new Map()

    // We need to append content before setting up the main renderer
    this.attachShadow({ mode: 'open' })
      .appendChild(this.constructor.template.content.cloneNode(true))

    // Setup main renderer
    this.$renderer = new ElementRenderer(this.shadowRoot, this)

    // Flag whether we are in a rendering phase
    this.$rendering = false

    // Is this a Galaxy Element?
    Object.defineProperty(this, ELEMENT_SYMBOL, { value: true })

    callHook(this, 'created')

    console.dir(this) // For debugging purposes
  }

  get state () {
    // Return proxified state
    return this[STATE_SYMBOL]
  }

  set state (state) {
    // Reassign state as proxy
    this[STATE_SYMBOL] = ProxyObserver.observe(
      state, {} /* takes default options */,
      () => { this.$render() } // Perform render on changes
    )

    // State change, so render...
    this.$render()
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
    // TODO: Maybe detach all listeners?

    callHook(this, 'detached')
  }

  /**
   *  NOTE: This hook needs some revision
   *
   *  attributeChangedCallback (...args) {
   *    callHook(this, 'attribute', ...args)
   *  }
   */

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
    const onceCalled = event => {
      this.$off(event, onceCalled)
      listener(event)
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
          e = new GalaxyError(e.message)

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
