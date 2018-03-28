import config from '../config.js'

export const createAnchor = config.debug
  ? content => new Comment(` ${content} `)
  : () => new Text() // Empty text node

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
  return new Function('outer', 'inner', 'value' /* Used only on setters */, 
    'with (outer) {' +
      'with (inner) {' +
        body +
      '}' +
    '}'
  )
}

export function diff ({ nodeValue }, newValue) {
  return nodeValue !== newValue
}
