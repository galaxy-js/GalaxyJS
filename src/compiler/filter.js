/**
 * Match filters to split within a template interpolation
 *
 * @type {RegExp}
 */
export const FILTER_SPLIT_REGEX = /(?<!\|)\|(?!\|)/

/**
 *
 */
const FILTER_REGEX = /^(?<name>[\w\d]+)\(/

/**
 *
 * @param {*} filters
 *
 * @return {string}
 */
export function getDescriptors (filters) {
  const descriptors = filters.map(filter => {
    filter = filter.trim()

    const match = FILTER_REGEX.exec(filter)
    const args = []

    let depth = 1
    let start = match[0].length
    let index = start

    function pushArg () {
      args.push(filter.slice(start, index - 1).trim())
    }

    // Get filter arguments
    loop: while (depth) {
      switch (filter.charAt(index++)) {
        case '(': depth += 1; break
        case ')': {
          if (depth === 1) {
            pushArg()
            break loop
          }

          depth -= 1
        } break
        case ',': {
          if (depth === 1) {
            pushArg()
            start = index
          }
        } break
        case '': break loop
      }
    }

    // TODO: Find a better arguments evaluation

    // We need to evaluate arguments before pass them
    return `
      (() => {
        const args = [${args.join(',')}]
        const method = ${match.groups.name}
        return value => method(value, ...args)
      })()
    `
  })

  return descriptors
}
