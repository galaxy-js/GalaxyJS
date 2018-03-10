import Renderer from './core/Renderer.js'
import Observer from './core/Observer.js'

import nextTick from './utils/next-tick.js'
import { isObject, isFunction } from './utils/type-check.js'

export default class Element extends HTMLElement {
  constructor () {
    super()

    // Default initial state
    // Just an empty pointer
    this.state = {}

    this.$document = document.currentScript.ownerDocument
    this.$shadow = this.attachShadow({ mode: 'open' })

    this.$template = this.$document.querySelector('template')
    this.$root = this.$template.content.cloneNode(true)

    // Setup core utilities
    this.$observer = new Observer()
    this.$renderer = new Renderer(this.$root.childNodes)

    this.$renderer.setupEvents(this)
    this.$shadow.appendChild(this.$root)

    // Defer state observation
    nextTick(() => {
      this._initState()
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
    this.$renderer.render(this.state, refresh)
  }
}
