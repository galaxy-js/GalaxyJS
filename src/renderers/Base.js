import { compileScopedGetter } from '../compiler/index.js'

export default class BaseRenderer {
  constructor (target, context, expression) {
    this.target = target
    this.context = context
    this.expression = expression

    const getter = compileScopedGetter(expression)

    this.getter = (locals = context.isolated) => {
      return getter(context.scope, locals)
    }
  }

  get value () {
    return this.getter()
  }

  render () {
    this.patch(
      this.target,
      this.value
    )
  }
}
