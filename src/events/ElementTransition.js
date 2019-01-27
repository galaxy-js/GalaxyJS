export default class ElementTransitionEvent extends Event {
  constructor (type, init) {
    super(type, init)

    /**
     * Element where the transition gets dispatched
     *
     * @type {HTMLElement}
     */
    this.$target = init.target

    /**
     * Transition stopped?
     *
     * @type {boolean}
     */
    this.$stopped = false

    /**
     * Transition performed?
     *
     * @type {boolean}
     */
    this.$performed = false

    /**
     * Callback for transitions
     *
     * @type {Function}
     * @private
     */
    this._transitionCb = init.transitionCb
  }

  /**
   * Custom `preventDefault`-like fn
   *
   * @return void
   */
  stop () {
    if (this.$performed) return

    this.$stopped = true
  }

  /**
   * Allow transition perform
   */
  play () {
    if (this.$performed) return

    this.$stopped = false
  }

  /**
   * Perform transition
   *
   * @return void
   */
  perform () {
    if (this.$stopped || this.$performed) return

    this.$stopped = false
    this.$performed = true

    this._transitionCb()
  }
}
