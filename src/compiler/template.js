/**
 * Match text template interpolation
 *
 * @type {RegExp}
 */
export const TEXT_TEMPLATE = /{{(?<expression>.*?)}}/

/**
 * Match html template interpolation
 *
 * @type {RegExp}
 */
export const HTML_TEMPLATE = /{{{(?<expression>.*?)}}}/

/**
 * Match filters to split within a template interpolation
 *
 * @type {RegExp}
 */
const FILTER_SPLIT_REGEX = /(?<!\|)\|(?!\|)/

/**
 * @type {RegExp}
 */
const FILTER_REGEX = /^(?<name>\w+)(?:\((?<args>.*)\))?$/

/**
 * Get a JavaScript expression
 *
 * @param {string} template - String with interpolation tags
 * @param {boolean} escape - Whether escape HTML or not
 *
 * @return {string}
 */
export function getExpression (template, escape = true) {
  let match

  // Hold inlined expressions
  const expressions = []

  // Escape HTML tags?
  const MATCH_REGEX = escape ? TEXT_TEMPLATE : HTML_TEMPLATE

  while (match = MATCH_REGEX.exec(template)) {
    const rawLeft = template.slice(0, match.index)
    let expression = match.groups.expression.trim()

    // Push wrapped left context
    if (rawLeft) expressions.push(`\`${rawLeft}\``)

    // Push isolated expression itself
    if (expression) {
      const parts = expression.split(FILTER_SPLIT_REGEX)

      expressions.push(
        parts.length > 1
          ? getFiltered(parts[0], parts.slice(1))
          : `(${expression})`
      )
    }

    template = template.slice(match.index + match[0].length)
  }

  // Push residual template expression
  if (template) expressions.push(`\`${template}\``)

  return expressions.join(' + ')
}

/**
 *
 * @param {string} expression
 * @param {Array.<Function>} filters
 *
 * @return {string}
 */
export function getFiltered (expression, filters) {
  filters = filters.map(filter => {
    const { groups } = FILTER_REGEX.exec(filter.trim())

    // Compose filter applier
    return `$value => ${groups.name}($value, ${groups.args})`
  })

  return `[${filters.join()}].reduce((result, filter) => filter(result), ${expression})`
}
