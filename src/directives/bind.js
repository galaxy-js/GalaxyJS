import { getEvaluator } from '../utils/evaluation.js'

export const BIND_DATA = 'gBind'

// Valid input types
const INPUT_TYPES = [
  'text',
  'password',
  'number',
  'radio',
  'date'
]

export default function bind (element, scope) {
  const path = element.dataset[BIND_DATA]
  delete element.dataset[BIND_DATA]

  let setting = false

  const setter = new Function('value', `this.state.${path} = value`)
  const getter = getEvaluator(path)

  element.addEventListener('input', event => {
    setting = true
    setter.call(scope, element.value)
  })

  return {
    render (state) {
      // Avoid re-dispatching on flush cycle
      // for an already assigned value
      if (setting) {
        setting = false
        return
      }

      const value = String(getter(state))

      if (element.value !== value) {
        element.value = value
      }
    }
  }
}
