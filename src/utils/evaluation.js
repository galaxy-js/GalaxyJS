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

/**
 *
 * @param {*} merges
 */
export function newIsolated (...merges) {
  return Object.assign(Object.create(null), ...merges)
}

export function getExpression (template, regex) {
  // Hold inlined expressions
  const expressions = []

  let match

  while (match = template.match(regex)) {
    const rawLeft = RegExp['$`']
    const expression = match[1].trim()

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
