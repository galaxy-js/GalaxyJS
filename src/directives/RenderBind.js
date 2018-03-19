import { digestData } from '../utils/generic.js'
import { compileSetter, compileGetter, diff } from '../utils/evaluation.js'

const BIND_ATTRIBUTE = 'g-bind'

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
  constructor (input) {
    this.input = input
    this.path = digestData(input, BIND_ATTRIBUTE)

    this.setting = false

    // Input -> State
    this.setter = compileSetter(this.path)

    // State -> Input
    this.getter = compileGetter(this.path)

    this.conversor = input.type === 'number' ? Number : String

    // Hold previous state
    this.__prev = null
  }

  // Change state (Input -> State)
  onInput (state) {
    this._onInput = ({ target }) => {
      this.setting = true
      this.setter(state, this.conversor(target.value))
    }

    this.input.addEventListener('input', this._onInput)
  }

  // Change input (State -> Input)
  render (state) {
    if (this.__prev !== state) {
      this.input.removeEventListener('input', this._onInput)
      this.onInput(state)
      this.__prev = state
    }

    // Avoid re-dispatching on flush cycle
    // for an already assigned value
    if (this.setting) {
      this.setting = false
      return
    }

    const value = String(this.getter(state))

    if (diff(this.input, value)) {
      this.input.value = value
    }
  }
}
