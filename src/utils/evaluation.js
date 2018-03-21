export function hasTemplate ({ nodeValue }) {
  return nodeValue.indexOf('{{') > -1
}

export function compileNestedGetter (expression) {
  return compileNestedEvaluator(`return ${expression}`)
}

export function compileNestedSetter (expression) {
  return compileNestedEvaluator(`${expression} = value`)
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
export function compileNestedEvaluator (body) {
  return new Function('outer', 'inner', 'value' /* Used only on setter */, `
    with (outer) {
      with (inner) {
        ${body}
      }
    }
  `)
}

export function diff ({ nodeValue }, newValue) {
  return nodeValue !== newValue
}
