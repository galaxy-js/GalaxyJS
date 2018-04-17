/**
 * Match filters to split within a template interpolation
 *
 * @type {RegExp}
 */
export const FILTER_SPLIT_REGEX = /(?<!\|)\|(?!\|)/

/**
 * @type {RegExp}
 */
const FILTER_REGEX = /^(?<name>\w+)(?<args>\()?/

/**
 *
 * @param {string} expression
 * @param {Array.<Function>} filters
 *
 * @return {string}
 */
export function getFiltered (expression, filters) {
  filters = filters.map(filter => {
    filter = filter.trim()

    const match = FILTER_REGEX.exec(filter)
    const args = []

    if (match.groups.args) {
      let depth = 1
      let start = match[0].length
      let index = start
      let inDouble = false
      let inSingle = false

      function pushArg () {
        args.push(filter.slice(start, index - 1).trim())
      }

      // Get filter arguments
      loop: while (depth) {
        const inExpression = !inDouble && !inSingle

        switch (filter.charAt(index++)) {
          case '(': inExpression && ++depth; break
          case '"': !inSingle && (inDouble = !inDouble); break
          case "'": !inDouble && (inSingle = !inSingle); break
          case '': break loop
          case ')': {
            if (inExpression && depth-- === 1) {
              pushArg()
              break loop
            }
          } break
          case ',': {
            if (inExpression && depth === 1) {
              pushArg()
              start = index
            }
          } break
        }
      }
    }

    // Compose filter applier
    return `$value => ${match.groups.name}($value, ...[${args.join()}])`
  })

  return `[${filters.join()}].reduce((result, filter) => filter(result), ${expression})`
}
