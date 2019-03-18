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

  let stringOpen
  let mode = 'expr'
  let stopped = false

  const state = {
    start,
    cursor: start,
    get previous () {
      return input.charCodeAt(this.cursor - 1)
    },
    get current () {
      return input.charCodeAt(this.cursor)
    },
    next () {
      this.cursor++
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

  while (state.cursor < length) {
    if (state.is(0x27/* ' */) || state.is(0x22/* " */)) {
      if (mode === 'expr') {
        mode = 'str'
        stringOpen = state.current
      } else if (state.is(stringOpen) && state.previous !== 0x5c/* \ */) {
        mode = 'expr'
        stringOpen = null

        // Skip current closing string quote
        state.next()
      }
    }

    if (mode === 'expr') {
      onExpr(state)

      // Current analyzing can be stopped from `onExpr` callback
      if (stopped) break
    }

    state.next()
  }
}
