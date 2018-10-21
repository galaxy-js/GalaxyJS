import { getFilterExpression } from './filter.js'

/**
 * Match text template interpolation
 *
 * @type {RegExp}
 */
export const TEXT_TEMPLATE_REGEX = /{{(?<expression>.*?)}}/

/**
 * Get an inlined JavaScript expression
 *
 * @param {string} template - String with interpolation tags
 *
 * @return {string}
 */
export function getTemplateExpression (template) {
  let match

  // Hold inlined expressions
  const expressions = []

  while (match = TEXT_TEMPLATE_REGEX.exec(template)) {
    const rawLeft = template.slice(0, match.index)
    let expression = match.groups.expression.trim()

    // Push wrapped left context
    if (rawLeft) expressions.push(`\`${rawLeft}\``)

    // TODO: Throw an error on empty template expressions
    // Push isolated expression itself
    if (expression) expressions.push(`_$n(${getFilterExpression(expression)})`)

    template = template.slice(match.index + match[0].length)
  }

  // Push residual template expression
  if (template) expressions.push(`\`${template}\``)

  return expressions.join(' + ')
}
