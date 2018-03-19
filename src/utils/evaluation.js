export function hasTemplate ({ nodeValue }) {
  return nodeValue.indexOf('{{') > -1
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
