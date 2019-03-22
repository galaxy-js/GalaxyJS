import { analyzer } from './analyzer.js'

import GalaxyError from '../errors/GalaxyError.js'

/**
 * Matches correct identifier name
 *
 * @type {RegExp}
 */
const METHOD_NAME_REGEX = /\w/

/**
 * Rewrite a given `expression` by intercepting
 * function calls passing the `state` as first argument
 *
 * @example
 *
 *   rewriteMethods('#rad(a, b) + multiply(d, f)') // rewrites to -> $commit('rad', a, b) + multiply(d, f)
 *
 * @param {string} expression - JavaScript expression to be rewritten
 *
 * @return {string}
 */
export function rewriteMethods (expression) {
  let rewritten = ''
  let stateful = false

  let method
  let start = 0
  let end = 0

  analyzer(expression, state => {
    switch (state.current) {
      case 0x23/* # */: {
        stateful = true
        start = state.cursor
        method = ''
      } break

      case 0x28/* ( */: {
        if (!stateful) return

        if (!method.length) {
          throw new GalaxyError('Unexpected args... Expecting stateful method name')
        }

        let args
        let depth = 1

        state.next()

        // Get arguments
        analyzer(expression, _state => {
          if (_state.is(0x28/* ( */)) {
            depth++
          } else if (_state.is(0x29/* ) */)) {
            if (!--depth) {
              args = expression.slice(_state.start, _state.cursor)
              rewritten += expression.slice(end, start) + `$commit('${method}'${args ? `, ${rewriteMethods(args)}` : ''})`

              end = _state.cursor + 1

              // Stop current analyze
              _state.stop()
            }
          }
        }, state.cursor)

        stateful = false

        // Sync with arguments analyzer
        state.to(end - 1)
      } break

      default: {
        if (stateful) {
          const char = String.fromCharCode(state.current)

          method += char

          if ((method.length === 1 && /[0-9]/.test(method)) || !METHOD_NAME_REGEX.test(char)) {
            throw new GalaxyError(`Unexpected char in stateful method name: #${method}<-`)
          }
        }
      } break
    }
  })

  return rewritten + expression.slice(end)
}
