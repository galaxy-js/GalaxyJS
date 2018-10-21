import { compileExpression } from '../compiler/index.js'
import { rewriteMethods } from '../compiler/method.js'

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

    // TODO: Remove rewrite methods, when state binding has been removed

    const getter = compileExpression(rewriteMethods(init.value))

    /**
     *
     */
    this.$getter = locals => {
      return getter(renderer.scope, Object.assign(
        Object.create(null),
        renderer.isolated,
        locals
      ))
    }

    // Initialize directive
    this.init()
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
