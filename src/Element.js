import ProxyObserver from 'https://cdn.jsdelivr.net/gh/LosMaquios/ProxyObserver/index.js'
import RenderElement from './core/RenderElement.js'

import nextTick from 'https://cdn.jsdelivr.net/gh/LosMaquios/next-tick/index.js'
import { isObject, isFunction, isReserved } from './utils/type-check.js'

import GalaxyError from './errors/GalaxyError.js'

export default class Element extends HTMLElement {
  constructor () {
    super()

    // Default initial state
    // Just an empty pointer
    this.state = {}

    // Actual event being dispatched
    this.$event = null

    // Hold element references
    this.$refs = new Map()

    this.$root = this.attachShadow({ mode: 'open' })

    this.$document = document.currentScript.ownerDocument
    this.$template = this.$document.querySelector('template')

    // We need to append content before setting up the main renderer
    this.$root.appendChild(this.$template.content.cloneNode(true))

    // Setup main renderer
    this.$renderer = new RenderElement(this.$root, this)

    // Flag whether we are in a rendering phase
    this.$rendering = false

    // Defer state observation
    nextTick.afterFlush(() => {
      // Reassign state as proxy
      this.state = ProxyObserver.observe(
        this.state, {} /* takes default options */,
        () => { this.$render() }// Perform render on changes
      )

      // First render call
      this.$render()

      console.dir(this)
    })
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
          this.$renderer.render(this.state)
        } catch (e) {
          nextTick(() => {
            throw e
          })
        }

        this.$rendering = false
      })
    }
  }
}
