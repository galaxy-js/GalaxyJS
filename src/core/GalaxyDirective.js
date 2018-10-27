import { compileExpression } from '../compiler/index.js'
import { rewriteMethods } from '../compiler/method.js'
import { newIsolated } from '../utils/generic.js';

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
    this.$element = renderer.element

    /**
     *
     */
    this.$options = Object.assign({}, options, this.constructor.options)

    if (!this.$options.$plain) {
      const getter = compileExpression(init.value)

      /**
       *
       */
      this.$getter = locals => {
        return getter(renderer.scope, newIsolated(renderer.isolated, locals))
      }
    }
  }

  /**
   * @noop
   */
  static get is () {
    return ''
  }

  /**
   * @noop
   */
  static match () {
    return true
  }

  /**
   * @noop
   */
  init () {

  }

  /**
   * @noop
   */
  render () {

  }
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
