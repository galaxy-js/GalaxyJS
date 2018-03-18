import Observer from './core/Observer.js'
import Renderer from './core/Renderer.js'

import nextTick from './utils/next-tick.js'
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
    this.$refs = {}

    this.$root = this.attachShadow({ mode: 'open' })

    this.$document = document.currentScript.ownerDocument
    this.$template = this.$document.querySelector('template')

    // Setup core utilities
    this.$observer = new Observer()
    this.$renderer = new Renderer(this)

    // Flag whether we are in a rendering phase
    this.$rendering = false

    const fragment = this.$template.content.cloneNode(true)

    this.$renderer.addRenders(fragment.childNodes)
    this.$root.appendChild(fragment)

    // Defer state observation
    nextTick.afterFlush(() => {
      this._initState()
      console.dir(this)
    })
  }

  _initState () {
    // Reassign state as proxy
    this.state = this.$observer.observe(this.state)

    this.$render()

    // Init state observation
    this.$onChange((target, property, value, receiver) => {
      Reflect.set(target, property, isObject(value) ? this.$observer.observe(value) : value, receiver)

      // Pass to rendering phase
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

  $render (refresh) {
    if (!this.$rendering) {
      this.$rendering = true

      nextTick(() => {
        this.$renderer.render(this.state, refresh)
        this.$rendering = false
      })
    }
  }
}
