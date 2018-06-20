/**
 * Match text template interpolation
 *
 * @type {RegExp}
 */
export const TEXT_TEMPLATE_REGEX = /{{(?<expression>.*?)}}/

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

// TODO: Check for invalid expressions like {{{ html }}}

/**
 * Get an inlined JavaScript expression
 *
 * @param {string} template - String with interpolation tags
 *
 * @return {string}
 */
export function getExpression (template) {
  let match

  // Hold inlined expressions
  const expressions = []

  while (match = TEXT_TEMPLATE_REGEX.exec(template)) {
    const rawLeft = template.slice(0, match.index)
    let expression = match.groups.expression.trim()

    // Push wrapped left context
    if (rawLeft) expressions.push(`\`${rawLeft}\``)

    // Push isolated expression itself
    if (expression) {
      const parts = expression.split(FILTER_SPLIT_REGEX)

      expressions.push(
        `_$n(${
          parts.length > 1
            ? `_$f(${parts[0]}, [${getDescriptors(parts.slice(1)).join()}])`
            : expression
        })`
      )
    }

    template = template.slice(match.index + match[0].length)
  }

  // Push residual template expression
  if (template) expressions.push(`\`${template}\``)

  return expressions.join(' + ')
}

/**
 * Get filter descriptors
 *
 * @param {Array.<string>} filters
 *
 * @return {Array.<string>}
 */
export function getDescriptors (filters) {
  return filters.map(filter => {
    const { groups } = FILTER_REGEX.exec(filter.trim())

    // Compose filter applier
    return `{
      name: '${groups.name}',
      args: ${groups.args ? `[${groups.args}]` : 'null'}
    }`
  })
}
