import ProxyObserver from 'proxy-observer'
import Compiler from '@galaxy/compiler'

import { setupRenderer } from './setup-renderer.js'

import CoreMixin from './mixins/Core.js'
import EventsMixin from './mixins/Events.js'
import HooksMixin from './mixins/Hooks.js'
import PrivatesMixin from './mixins/Privates.js'

import { callHook, applyMixins, hyphenate } from '../utils/generic.js'

/**
 * Internal
 */
const __proxies__ = new WeakMap()

/**
 * Creates a GalaxyElement class
 *
 * @param {HTMLElement} SuperElement
 *
 * @return {GalaxyElement}
 *
 * @api public
 */
export function extend (SuperElement) {

  class GalaxyElement extends SuperElement {

    /**
     * Hold element references
     *
     * @type {Object.<Element>}
     * @public
     */
    $refs = Object.create(null)

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
     * Determines whether we are in a rendering phase
     *
     * @type {boolean}
     * @public
     */
    $rendering = false

    /**
     * State for data-binding
     *
     * @type {Object}
     * @public
     */
    get state () { return __proxies__.get(this) }
    set state (state) {
      const render = () => { this.$render() }

      __proxies__.set(this, ProxyObserver.observe(state, { patch: true }, render))

      // State change, so render...
      render()
    }

    /**
     * Galaxy element name
     *
     * @type {string}
     * @public
     */
    static get is () { return hyphenate(this.name) }
    get $name () { return this.constructor.is }

    /**
     * Children GalaxyElement definitions
     *
     * @type {Array<GalaxyElement>}
     * @public
     */
    static children = []

    constructor () {
      super()

      // This performs the initial render
      this.state = {}

      /**
       * Compiler for directives
       *
       * @type {Compiler}
       * @public
       */
      this.$compiler = new Compiler({ scope: this })

      /**
       * Main renderer
       *
       * @type {ChildrenRenderer}
       * @public
       */
      this.$renderer = setupRenderer(this)

      // Call element initialization
      callHook(this, 'created')
    }
  }

  /**
   * Used internally
   * Simply to avoid: GalaxyElement.prototype.__proto__.[[constructor]]
   *
   * @type {boolean}
   */
  GalaxyElement.extendsBuiltIn = SuperElement !== HTMLElement

  /**
   * Is this element resolved?
   *
   * @type {boolean}
   */
  GalaxyElement.resolved = false

  /**
   * Mark (both constructor and __proto__) as GalaxyElement
   */
  GalaxyElement.prototype.$galaxy = GalaxyElement.$galaxy = true

  // Mix features
  applyMixins(GalaxyElement, [
    CoreMixin,
    EventsMixin,
    HooksMixin,
    PrivatesMixin
  ])

  // Return mixed
  return GalaxyElement
}
