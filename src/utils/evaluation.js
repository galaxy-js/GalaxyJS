const TEMPLATE_REGEX = /{{(.*?)}}/

export function hasTemplate ({ nodeValue }) {
  return nodeValue.indexOf('{{') > -1
}

export function compileGetter (expression) {
  return new Function('context', `
    with (context) {
      return ${expression}
    }
  `)
}

export function compileSetter (expression) {
  return new Function('context', 'value', `
    with (context) {
      ${expression} = value
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
