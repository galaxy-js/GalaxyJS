export function hasTemplate ({ nodeValue }) {
  return nodeValue.indexOf('{{') > -1
}

/**
 * Compile an evaluator function with
 * inner and outer contexts.
 *
 * The inner context overrides the outer.
 *
 * @param {string} expression
 *
 * @return {Function}
 */
export function compileNestedEvaluator (expression) {
  return new Function('outer', 'inner', `
    with (outer) {
      with (inner) {
        ${expression}
      }
    }
  `)
}

export function compileGetter (expression) {
  return new Function('context', `
    with (context) {
      return ${expression}
    }
  `)
}

export function compileSetter (expression) {
  return new Function('context', 'value', `
    with (context) {
      ${expression} = value
    }
  `)
}

export function diff ({ nodeValue }, newValue) {
  return nodeValue !== newValue
}
