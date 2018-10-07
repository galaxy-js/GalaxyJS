import { compileScopedGetter } from '../compiler/index.js'

export default class BaseRenderer {
  constructor (target, context, expression) {
    this.target = target
    this.context = context
    this.expression = expression

    const getter = compileScopedGetter(expression)

    this.getter = locals => {
      return getter(context.scope, Object.assign({}, context.isolated, locals))
    }
  }

  get value () {
    return this.getter()
  }

  render () {
    this.patch(this.target, this.value)
  }
}
