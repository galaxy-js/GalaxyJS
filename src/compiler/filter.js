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
 * Get filter expression
 *
 * @param {string} expression
 *
 * @return {string}
 */
export function getFilterExpression (expression) {
  const parts = expression.split(FILTER_SPLIT_REGEX)

  return parts.length > 1
    ? `_$f(${parts[0]}, [${getDescriptors(parts.slice(1)).join()}])`
    : expression
}

/**
 * Get filter descriptors
 *
 * @param {Array.<string>} filters
 *
 * @return {Array.<string>}
 */
function getDescriptors (filters) {
  return filters.map(filter => {
    const { groups } = FILTER_REGEX.exec(filter.trim())

    // Compose filter applier
    return `{
      name: '${groups.name}',
      args: ${groups.args ? `[${groups.args}]` : 'null'}
    }`
  })
}
