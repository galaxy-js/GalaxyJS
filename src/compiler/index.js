import global from '../core/global.js'

import { getTemplateExpression } from './template.js'
import { getFilterExpression } from './filter.js'
import { rewriteMethods } from './method.js'

export { TEXT_TEMPLATE_REGEX } from './template.js'

/**
 * Cache evaluators
 *
 * @type {Map<string, Function>}
 * @private
 */
const __evaluators__ = new Map()

/**
 * Compile a given template expression
 *
 * A template expression looks like this: 'Hello, {{ firstName }} {{ lastName }}'
 *
 * @param {string} template
 *
 * @return {Function}
 */
export function compileTemplate (template) {
  return compileScopedGetter(getTemplateExpression(template))
}

/**
 * Compile a given expression
 *
 * @param {string} expression
 *
 * @return {Function}
 */
export function compileExpression (expression) {
  return compileScopedGetter(getFilterExpression(expression))
}

/**
 * Compile a given event expression
 *
 * @param {string} expression
 *
 * @return {Function}
 */
export function compileEvent (expression) {
  return compileScopedEvaluator(rewriteMethods(expression))
}

/**
 * Compile an scoped getter with given `expression`
 *
 * @param {string} expression - JavaScript expression
 *
 * @return {Function}
 */
export function compileScopedGetter (expression) {
  return compileScopedEvaluator(`return ${expression}`)
}

/**
 * Compile an scoped setter with given `expression`
 *
 * @param {string} expression - JavaScript expression
 *
 * @return {Function}
 */
export function compileScopedSetter (expression) {
  return compileScopedEvaluator(`(${expression} = __args__[0])`)
}

/**
 * Compile a scoped evaluator function
 *
 * @param {string} body - Function body
 *
 * @return {Function}
 */
export function compileScopedEvaluator (body) {
  let evaluator = __evaluators__.get(body)

  if (!evaluator) {

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
    evaluator = new Function(
      '__global__', '__locals__', '...__args__',
      `with (__global__) {
        with (this) {
          with (state) {
            with (__locals__) {
              ${body}
            }
          }
        }
      }`
    )

    // Cache evaluator with body as key
    __evaluators__.set(body, evaluator)
  }

  return (scope, locals, ...args) => {
    return evaluator.call(scope, global, locals, ...args)
  }
}
