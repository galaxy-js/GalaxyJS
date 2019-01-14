import { compileExpression } from '../../compiler/index.js'
import { newIsolated } from '../../utils/generic.js'

/**
 * Get an `indexBy` function from a given element
 *
 * @param {HTMLElement} element
 *
 * @return {Function}
 */
export function getIndexByFn (element) {
  const indexBy = compileExpression(element.getAttribute('by'))

  return function (isolated) {
    return indexBy(this.scope, newIsolated(this.isolated, isolated))
  }
}
