const TEMPLATE_REGEX = /{{(.*?)}}/
const EVENT_REGEX = /^([\w\d]+)(?:\(([^)]*)\))?$/

export function hasTemplate ({ nodeValue }) {
  return nodeValue.indexOf('{{') > -1
}

export function getEvaluator (expression) {
  return new Function('context', `
    with (context) {
      return ${expression}
    }
  `)
}

export function getExpression ({ nodeValue }) {
  let template = nodeValue

  // Save inline expressions
  let parsedExpression = ''
  let match

  while (match = template.match(TEMPLATE_REGEX)) {
    const leftText = RegExp.leftContext
    if (leftText) parsedExpression += JSON.stringify(leftText)

    const expression = match[1].trim()
    if (expression) parsedExpression += `${leftText ? ' + ' : ''}(${expression})`

    template = RegExp.rightContext
  }

  return parsedExpression + (template ? `+ ${JSON.stringify(template)}` : '')
}

export function attachEvent (element, { name, nodeValue }, scope) {
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
