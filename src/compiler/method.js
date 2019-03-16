/**
 * For event call rewriting
 *
 * @type {RegExp}
 */
const METHOD_REGEX = /#(?<name>\w+)\(/

/**
 * Rewrite a given `expression` by intercepting
 * function calls passing the `state` as first argument
 *
 * @example
 *
 *   rewriteMethods('#rad(a, b) + multiply(d, f)') // rewrites to -> $commit('rad', a, b) + multiply(d, f)
 *
 * @param {string} expression - JavaScript expression to be rewritten
 *
 * @return {string}
 */
export function rewriteMethods (expression) {
  let match
  let rewritten = ''

  while (match = expression.match(METHOD_REGEX)) {
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

    // Intercept method call with $commit
    rewritten += expression.slice(0, index) + `$commit('${groups.name}'${args ? `, ${rewriteMethods(args)}` : ''})`

    // Skip rewritten
    expression = expression.slice(cursor)
  }

  return rewritten + expression // <- Left expression
}
