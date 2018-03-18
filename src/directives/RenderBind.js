import { digestData } from '../utils/generic.js'
import { compileSetter, compileGetter } from '../utils/evaluation.js'

export const BIND_TOKEN = ':'

export const BIND_ATTRIBUTE = 'g-bind'

/**
 * With support just for input types:
 *
 *   - Password
 *   - Text
 *   - Email
 *   - Search
 *   - URL
 *   - Number
 */
export default class RenderBind {
  constructor (input, scope) {
    this.input = input
    this.scope = scope

    this.path = digestData(input, BIND_ATTRIBUTE)

    this.setting = false

    // Input -> State
    this.setter = compileSetter(this.path)

    // State -> Input
    this.getter = compileGetter(this.path)

    this.conversor = input.type === 'number' ? Number : String

    this.onInput()
  }

  // Change state (Input -> State)
  onInput () {
    this.input.addEventListener('input', ({ target }) => {
      this.setting = true
      this.setter(this.scope.state, this.conversor(target.value))
    })
  }

  // Change input (State -> Input)
  render (state) {
    // Avoid re-dispatching on flush cycle
    // for an already assigned value
    if (this.setting) {
      this.setting = false
      return
    }

    const value = String(this.getter(state))

    if (this.input.value !== value) {
      this.input.value = value
    }
  }
}
