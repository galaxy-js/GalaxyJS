import { digestData, toString } from '../utils/generic.js'
import { compileNestedSetter, compileNestedGetter, diff } from '../utils/evaluation.js'

const BIND_ATTRIBUTE = '*bind'

export const BIND_TOKEN = ':'

export function needBind (element) {
  return (
    BIND_ATTRIBUTE in element.attributes &&
    element instanceof HTMLInputElement
  )
}

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
  constructor (input, scope, isolated) {
    this.input = input
    this.scope = scope

    // Inherit isolated scope
    this.isolated = isolated

    this.path = digestData(input, BIND_ATTRIBUTE)

    this.setting = false

    // Input -> State
    this.setter = compileNestedSetter(this.path)

    // State -> Input
    this.getter = compileNestedGetter(this.path)

    this.conversor = input.type === 'number' ? Number : String

    this._onInput()
  }

  // Change state (Input -> State)
  _onInput () {
    this.input.addEventListener('input', ({ target }) => {
      this.setting = true
      this.setter(this.scope.state, this.isolated, this.conversor(target.value))
    })
  }

  // Change input (State -> Input)
  render () {
    // Avoid re-dispatching on flush cycle
    // for an already assigned value
    if (this.setting) {
      this.setting = false
      return
    }

    const value = toString(this.getter(this.scope.state, this.isolated))

    if (diff(this.input, value)) {
      this.input.value = value
    }
  }
}
