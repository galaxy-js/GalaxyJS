/**
 * For event call rewriting
 *
 * @type {RegExp}
 */
const METHOD_REGEX = /(?<prefix>\W)?(?<name>\w+)\(/g

/**
 * Rewrite a given `expression` for event binding
 *
 * @param {string} expression - JavaScript expression to be rewritten
 *
 * @return {string}
 */
export function getEvent (expression) {
  let match
  let rewrited = expression

  while (match = METHOD_REGEX.exec(expression)) {
    const { index, groups } = match

    // In case we are in a sub path, skip
    if (groups.prefix === '.') continue

    const start = index + match[0].length

    // Initial depth `(` = 1
    let depth = 1
    let cursor = start

    // Catch arguments
    loop: while (depth) {
      switch (expression.charAt(cursor++)) {
        case ')': depth -= 1; break
        case '(': depth += 1; break
        case '': break loop
      }
    }

    // Get arguments
    const args = expression.slice(start, cursor - 1 /* skip parenthesis */)

    rewrited = rewrited.replace(
      expression.slice(groups.prefix ? index + 1/* skip prefix */ : index, cursor),

      // Intercept with $commit call
      `$commit('${groups.name}'${args ? `, ${args}` : ''})`
    )
  }

  return rewrited
}
