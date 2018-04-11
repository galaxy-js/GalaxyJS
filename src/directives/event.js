import { digestData } from '../utils/generic.js'
import { compileScopedEvaluator, getEvent } from '../compiler/index.js'

const EVENT_TOKEN = '@'

export function isEvent ({ name }) {
  return name.startsWith(EVENT_TOKEN)
}

export default function event ({ name }, context) {
  const $el = context.element

  const expression = digestData($el, name)
  const evaluator = compileScopedEvaluator(getEvent(expression), context)

  $el.addEventListener(name.slice(1), event => {
    // Externalize event
    context.scope.$event = event

    evaluator()

    context.scope.$event = null
  })
}
