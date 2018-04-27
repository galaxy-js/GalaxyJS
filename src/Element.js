import ProxyObserver from 'https://cdn.jsdelivr.net/gh/LosMaquios/ProxyObserver@v0.3.2/index.js'
import RenderElement from './core/RenderElement.js'

import nextTick from 'https://cdn.jsdelivr.net/gh/LosMaquios/next-tick@v0.1.0/index.js'
import { isObject, isFunction, isReserved } from './utils/type-check.js'
import { callHook } from './utils/generic.js'

import GalaxyError from './errors/GalaxyError.js'
import { channel } from './channel.js'

const STATE_SYMBOL = Symbol('Galaxy.State')

export default class Element extends HTMLElement {
  constructor () {
    super()

    // Default initial state
    // Just an empty object
    // Note: This also calls initial render
    this.state = {}

    // Hold component properties
    // TODO: How to properly define properties?
    // TODO: Reflect props to attributes?
    this.props = this.constructor.properties

    // Actual event being dispatched
    this.$event = null

    // For parent communication
    this.$parent = null

    // For indirect galaxy elements communication
    this.$channel = channel

    // Hold element references
    this.$refs = new Map()

    this.$root = this.attachShadow({ mode: 'open' })

    // TODO: How to properly get context?
    this.$document = this.constructor.__CONTEXT__
    this.$template = this.$document.querySelector('template')

    // We need to append content before setting up the main renderer
    this.$root.appendChild(this.$template.content.cloneNode(true))

    // Setup main renderer
    this.$renderer = new RenderElement(this.$root, this)

    // Flag whether we are in a rendering phase
    this.$rendering = false

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

    callHook(this, 'created')
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

  /**
   *  NOTE: This hook needs some revision
   *
   *  attributeChangedCallback (...args) {
   *    callHook(this, 'attribute', ...args)
   *  }
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

  $render () {
    if (!this.$rendering) {
      this.$rendering = true

      nextTick(() => {

        // References are cleared before each render phase
        // then they going to be filled up
        this.$refs.clear()

        try {
          this.$renderer.render()
        } catch (e) {
          // Avoid stack collapsing
          nextTick(() => {
            throw e
          })
        }

        // Sleep after render new changes
        this.$rendering = false
      })
    }
  }
}
