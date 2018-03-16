import { getEvaluator } from '../utils/evaluation.js'

const EVENT_REGEX = /^([\w\d]+)(?:\(([^)]*)\))?$/

export default function event (element, { name, nodeValue }, scope) {
  let match

  if (match = nodeValue.match(EVENT_REGEX)) {
    const [, method, args] = match
    const evaluator = getEvaluator(`$commit('${method}'${args ? `, ${args}` : ''})`)

    element.removeAttribute(name)
    element.addEventListener(name.slice(1), event => {
      // Externalize event
      scope.$event = event

      evaluator(scope)

      scope.$event = null
    })
  }
}
