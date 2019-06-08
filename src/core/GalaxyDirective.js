import { newIsolated, hyphenate } from '../utils/generic.js'

/**
 * Default directive options
 *
 * @enum {*}
 */
const options = {
  $plain: false,
  $render: true
}

export default class GalaxyDirective {

  /**
   * @noop
   */
  static match () {
    return true
  }

  static get is () {
    return hyphenate(this.name)
  }

  constructor (init, renderer) {

    /**
     *
     */
    this.$name = init.name

    /**
     *
     */
    this.$args = init.args

    /**
     *
     */
    this.$value = init.value

    /**
     *
     */
    this.$renderer = renderer

    /**
     *
     */
    this.$scope = renderer.scope

    /**
     *
     */
    this.$compiler = this.$scope.$compiler

    /**
     *
     */
    this.$element = renderer.element

    /**
     *
     */
    this.$options = Object.assign({}, options, this.constructor.options)

    if (!this.$options.$plain) {
      const getter = this.$compiler.compileExpression(init.value)

      /**
       *
       */
      this.$getter = locals => getter(newIsolated(renderer.isolated, locals))
    }
  }

  /**
   * @noop
   */
  init () {}

  /**
   * @noop
   */
  enter () {}

  /**
   * @noop
   */
  move () {}

  /**
   * @noop
   */
  leave () {}

  /**
   * @noop
   */
  render () {}
}

/**
 * Filled in registration time
 */
GalaxyDirective._matcher = null

/**
 * Fill match
 */
GalaxyDirective._match = function (name) {
  const match = this._matcher.exec(name)

  return match && match.groups
}
