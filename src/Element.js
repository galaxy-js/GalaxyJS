import ProxyObserver from 'https://cdn.jsdelivr.net/gh/LosMaquios/ProxyObserver@v0.3.2/index.js'
import RenderElement from './core/RenderElement.js'

import nextTick from 'https://cdn.jsdelivr.net/gh/LosMaquios/next-tick@v0.1.0/index.js'
import { isObject, isFunction, isReserved } from './utils/type-check.js'

import GalaxyError from './errors/GalaxyError.js'

const STATE_SYMBOL = Symbol('Galaxy.State')

export default class Element extends HTMLElement {
  constructor () {
    super()

    // Default initial state
    // Just an empty object
    // Note: This also calls initial render
    this.state = {}

    // Actual event being dispatched
    this.$event = null

    // Hold component properties
    // TODO: How to properly define properties?
    // TODO: Reflect props to attributes?
    this.props = this.constructor.properties

    // Hold element references
    this.$refs = new Map()

    this.$root = this.attachShadow({ mode: 'open' })

    // TODO: How to properly get context?
    this.$document = this.constructor.__CONTEXT__
    this.$template = this.$document.querySelector('template')

    // We need to append content before setting up the main renderer
    this.shadowRoot.appendChild(this.$template.content.cloneNode(true))

    // Setup main renderer
    this.$renderer = new RenderElement(this.$root, this)

    // Flag whether we are in a rendering phase
    this.$rendering = false

    // TODO: Remove this flag
    this.__galaxy__ = true

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
