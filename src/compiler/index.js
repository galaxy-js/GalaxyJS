export { getEvent } from './event.js'
export { getExpression } from './template.js'

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
      with (state) {
        with (this.isolated) {
          ${body}
        }
      }
    }
  `).bind(context)
}
