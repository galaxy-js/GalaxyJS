/**
 * For event call rewriting
 *
 * @type {RegExp}
 */
const EVENT_REGEX = /(?<=^|\s)(?<method>[\w\d]+)\(/g

/**
 * Match text template interpolation
 *
 * @type {RegExp}
 */
const TEXT_REGEX = /{{(?<content>.*?)}}/

/**
 * Match html template interpolation
 *
 * @type {RegExp}
 */
const HTML_REGEX = /{{{(?<content>.*?)}}}/

/**
 * Check if the value of a given `node`
 * differs againts the given `value`
 *
 * @param {Node} node - Node element to check
 * @param {*} value - Value to compare with
 *
 * @return {boolean}
 */
export function differ (node, value) {
  return node.nodeValue !== value
}

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

  while (match = EVENT_REGEX.exec(expression)) {
    const { index, groups } = match

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
      expression.slice(index, cursor),

      // Intercept with $commit call
      `$commit('${groups.method}'${args ? `, ${args}` : ''})`
    )
  }

  return rewrited
}

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
  const MATCH_REGEX = escape ? TEXT_REGEX : HTML_REGEX

  while (match = MATCH_REGEX.exec(template)) {
    const rawLeft = RegExp['$`']
    const expression = match.groups.content.trim()

    // Push wrapped left context
    if (rawLeft) expressions.push(`\`${rawLeft}\``)

    // Push isolated expression itself
    if (expression) expressions.push(`(${expression})`)

    template = RegExp["$'"] // .rightContext
  }

  // Push residual template expression
  if (template) expressions.push(`\`${template}\``)

  return expressions.join(' + ')
}

/**
 * Compile an scoped getter with given `expression`
 *
 * @param {string} expression - JavaScript expression
 * @param {*} context - Getter context
 *
 * @return {Function}
 */
export function compileScopedGetter (expression, context) {
  return compileScopedEvaluator(`return ${expression}`, context)
}

/**
 * Compile an scoped setter with given `expression`
 *
 * @param {string} expression - JavaScript expression
 * @param {*} context - Setter context
 *
 * @return {Function}
 */
export function compileScopedSetter (expression, context) {

  /**
   * Wrap the whole expression within parenthesis
   * to avoid statement declarations
   */
  return compileScopedEvaluator(`(${expression} = value)`, context)
}

/**
 * Compile an evaluator function with scoped context
 *
 * @param {string} body - Function body
 * @param {*} context - Function context
 *
 * @return {Function}
 */
export function compileScopedEvaluator (body, context) {

  /**
   * Allow directly access to:
   *
   *   1. `scope`: Custom element instance itself
   *   2. `scope.state`: State taken from custom element
   *   3. `isolated`: Isolated scope internally used by loop directive
   *
   * In that order, `isolated` overrides `scope.state` data,
   * and `scope` is going to be overriden by `scope.state` data.
   */
  return new Function('value' /* Used only on setters */, `
    with (this.scope) {
      with (this.scope.state) {
        with (this.isolated) {
          ${body}
        }
      }
    }
  `).bind(context)
}
