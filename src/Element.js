import Observer from './core/Observer.js'
import RenderElement from './core/RenderElement.js'

import nextTick from './utils/next-tick.js'
import { isObject, isFunction } from './utils/type-check.js'

export default class Element extends HTMLElement {
  constructor () {
    super()

    // Default initial state
    // Just an empty pointer
    this.state = {}

    // Actual event being dispatched
    this.$event = null

    this.$root = this.attachShadow({ mode: 'open' })

    this.$document = document.currentScript.ownerDocument
    this.$template = this.$document.querySelector('template')

    // Setup core utilities
    this.$observer = new Observer()

    // Hacky to avoid attributes initialization error
    this.$root.attributes = []

    this.$root.appendChild(this.$template.content.cloneNode(true))

    this.$renderer = new RenderElement(this.$root, this)
    this.$rendering = false

    // Defer state observation
    nextTick(() => {
      this._initState()

      console.dir(this)
    })
  }

  _initState () {
    // Reassign state as proxy
    this.state = this.$observer.observe(this.state)

    this.$observer.sub(this._onStateChange.bind(this))

    this.$render()
  }

  _onStateChange (target, property, value, receiver) {
    value = isObject(value) ? this.$observer.observe(value) : value

    Reflect.set(target, property, value, receiver)

    // Pass to rendering phase
    this.$render()
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
