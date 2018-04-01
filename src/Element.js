import Observer from './core/Observer.js'
import RenderElement from './core/RenderElement.js'

import nextTick from './utils/next-tick.js'
import { isObject, isFunction, isReserved } from './utils/type-check.js'

import GalaxyError from './errors/GalaxyError.js'

const ISOLATED_VALUES_SYMBOL = Symbol('Galaxy.ValuesIsolated')

export default class Element extends HTMLElement {
  constructor () {
    super()

    // Default initial state
    // Just an empty pointer
    this.state = {}

    // Actual event being dispatched
    this.$event = null

    // Hold element references
    this.$refs = {}

    // Isolated values
    this.$isolated = Object.create(null)

    this.$root = this.attachShadow({ mode: 'open' })

    this.$document = document.currentScript.ownerDocument
    this.$template = this.$document.querySelector('template')

    // We need to append content before setting up the main renderer
    this.$root.appendChild(this.$template.content.cloneNode(true))

    // Setup core utilities
    this.$observer = new Observer()
    this.$renderer = new RenderElement(this.$root, this)

    // Flag whether we are in a rendering phase
    this.$rendering = false

    // Defer state observation
    nextTick.afterFlush(() => {
      this._initState()

      // First render call
      this.$render()

      console.dir(this)
    })
  }

  _initState () {
    // Reassign state as proxy
    this.state = this.$observer.observe(this.state)

    // Init state observation
    this.$onChange((target, property, value, receiver) => {
      Reflect.set(target, property, isObject(value) ? this.$observer.observe(value) : value, receiver)

      // Compile and render new changes
      this.$render()
    })
  }

  $onChange (callback) {
    this.$observer.sub(callback.bind(this))
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

  $extend (...merges) {
    Object.assign(this.$isolated, ...merges)
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
