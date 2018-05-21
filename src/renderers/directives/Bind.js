import { getAttr, differ } from '../../utils/generic.js'
import { compileScopedSetter, compileScopedGetter } from '../../compiler/index.js'

const BIND_ATTRIBUTE = '*bind'

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
export default class BindRenderer {
  constructor (input, context) {
    this.input = input
    this.context = context

    this.path = getAttr(input, BIND_ATTRIBUTE)

    this.setting = false

    // Input -> State
    this.setter = compileScopedSetter(this.path, context)

    // State -> Input
    this.getter = compileScopedGetter(this.path, context)

    this.conversor = input.type === 'number' ? Number : String

    this._onInput()
  }

  static is (element) {
    return (
      BIND_ATTRIBUTE in element.attributes &&
      element instanceof HTMLInputElement
    )
  }

  // Change state (Input -> State)
  _onInput () {
    this.input.addEventListener('input', ({ target }) => {
      this.setting = true
      this.setter(this.conversor(target.value))
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

    const value = String(this.getter())

    if (differ(this.input, value)) {
      this.input.value = value
    }
  }
}
