import { analyzer } from './analyzer.js'

import GalaxyError from '../errors/GalaxyError.js'

/**
 * Match filter
 *
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
  const parts = []

  let start = 0

  // Skips `|` and `>` tokens
  const SKIP_FILTER_TOKEN = 2

  analyzer(expression, state => {
    if (state.is(0x3e/* > */) && state.previous === 0x7c/* | */) {
      parts.push(expression.slice(start, (start = state.cursor + 1) - SKIP_FILTER_TOKEN))
    }
  })

  const last = expression.slice(start)

  if (!last.trim().length) {
    throw new GalaxyError(`Unexpected end of expression filter: ${expression}`)
  }

  return parts.length
    ? `_$f(${parts[0]}, [${getDescriptors(parts.slice(1).concat(last)).join()}])`
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
    filter = filter.trim()
    const match = FILTER_REGEX.exec(filter)

    if (!match) {
      throw new GalaxyError(`Wrong syntax for filter: |> ${filter}`)
    }

    const { groups } = match

    // Compose filter applier
    return `{
      name: '${groups.name}',
      args: ${groups.args ? `[${groups.args}]` : 'null'}
    }`
  })
}
