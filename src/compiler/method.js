/**
 * For event call rewriting
 *
 * @type {RegExp}
 */
const METHOD_REGEX = /#(?<name>\w+)\(/g

/**
 * Rewrite a given `expression` by intercepting
 * functions calls passing the `state` as first argument
 *
 * @param {string} expression - JavaScript expression to be rewritten
 *
 * @return {string}
 */
export function rewriteMethods (expression) {
  let match
  let rewrited = expression

  while (match = METHOD_REGEX.exec(expression)) {
    const { index, groups } = match

    const start = index + match[0].length

    // Initial depth `(` = 1
    let depth = 1
    let cursor = start
    let inDouble = false
    let inSingle = false

    // Catch arguments
    loop: while (depth) {
      const inExpression = !inDouble && !inSingle

      // TODO: Check edge cases like 'literal template expressions'

      switch (expression.charCodeAt(cursor++)) {
        case 0x28/* ( */: inExpression && ++depth; break
        case 0x29/* ) */: inExpression && --depth; break
        case 0x22/* " */: !inSingle && (inDouble = !inDouble); break
        case 0x27/* ' */: !inDouble && (inSingle = !inSingle); break
        case NaN: break loop
      }
    }

    // Get arguments
    const args = expression.slice(start, cursor - 1 /* skip parenthesis */)

    rewrited = rewrited.replace(
      expression.slice(index, cursor),

      // Intercept method call with $commit
      `$commit('${groups.name}'${args ? `, ${args}` : ''})`
    )
  }

  return rewrited
}
