/**
 * Intercept expression chars to rewrite/process a given input
 *
 * @example
 *
 *  analyzer('#someMethod("a")', state => { // skips "a" string
 *    console.log(state.current) // <- current expression char code
 *  })
 *
 * @param {string} input
 * @param {Function} onExpr
 * @param {number} start
 *
 * @return void
 */
export function analyzer (input, onExpr, start = 0) {
  const { length } = input

  /**
   * Flag for modes:
   *
   *   expr -> For expresssions
   *   str  -> For strings
   *   tmpl -> For template strings
   *
   * @type {string}
   */
  let mode = 'expr'

  /**
   * Hold current opening string char
   *
   *  tmpl -> `
   *  str  -> ' "
   *
   * @type {string}
   */
  let stringOpen

  /**
   * Indicates whether the analyzer is stopped
   *
   * @type {boolean}
   */
  let stopped = false

  /**
   * Check for escaping chars
   *
   * @type {boolean}
   */
  let escaping = false

  let templateDepth = 0
  const templateDepthStack = []

  const state = {
    start,
    cursor: start,
    get previous () {
      return this.at(-1)
    },
    get current () {
      return this.at(0)
    },
    get end () {
      return this.cursor >= length
    },
    at (offset) {
      return input.charCodeAt(this.cursor + offset)
    },
    next (offset = 1) {
      this.cursor += offset
    },
    stop () {
      stopped = true
    },
    to (index) {
      this.cursor = index
    },
    is (code) {
      return this.current === code
    }
  }

  while (!state.end) {
    const inExpr = mode === 'expr'

    if (state.is(0x24/* $ */) && state.at(1) === 0x7b/* { */ && mode === 'tmpl' && !escaping) {
      mode = 'expr'
      templateDepthStack.push(templateDepth++)

      // Skip `${`
      state.next(2)
    } else if (state.is(0x7b/* { */) && inExpr) {
      templateDepth++
    } else if (state.is(0x7d/* } */) && inExpr && --templateDepth === templateDepthStack[templateDepthStack.length - 1]) {
      mode = 'tmpl'
      templateDepthStack.pop()
    } else {
      const isTemplate = state.is(0x60/* ` */)

      if (isTemplate || state.is(0x27/* ' */) || state.is(0x22/* " */)) {
        if (inExpr) {
          mode = isTemplate ? 'tmpl' : 'str'
          stringOpen = state.current
        } else if (state.is(stringOpen) && !escaping) {
          mode = 'expr'
          stringOpen = null

          // Skip current closing string quote
          state.next()
        }
      }
    }

    if (mode === 'expr' && !state.end) {
      onExpr(state)

      // Current analyzing can be stopped from `onExpr` callback
      if (stopped) break
    }

    // Detect correct escaping
    escaping = mode !== 'expr' && state.is(0x5c/* \ */) && !escaping

    state.next()
  }
}
