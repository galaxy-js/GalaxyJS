import { digestData } from '../utils/generic.js'
import { compileNestedEvaluator } from '../utils/evaluation.js'

const EVENT_REGEX = /^([\w\d]+)(?:\(([^)]*)\))?$/

export const EVENT_TOKEN = '@'

export default function event (element, name, scope, isolated) {
  let match

  const fnCall = digestData(element, name)

  if (match = fnCall.match(EVENT_REGEX)) {
    const [, method, args] = match
    const evaluator = compileNestedEvaluator(`$commit('${method}'${args ? `, ${args}` : ''})`)

    element.addEventListener(name.slice(1), event => {
      // Externalize event
      scope.$event = event

      evaluator(scope, isolated)

      scope.$event = null
    })
  }
}
