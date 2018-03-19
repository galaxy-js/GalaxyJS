import RenderElement from '../core/RenderElement.js'

import { digestData } from '../utils/generic.js'
import { compileGetter } from '../utils/evaluation.js'

// Note: to maintain consistence avoid `of` reserved word on iterators.

const LOOP_ATTRIBUTE = 'g-for'

/**
 * Captures:
 *
 *   [item] in [expression]
 */
const SIMPLE_LOOP_REGEX = /^(.*)\s+in\s+(.*)$/

/**
 * Captures:
 *
 *   ([item], [key|index]) in [expression]
 */
const COMPLEX_LOOP_REGEX = /^\((.*),(.*)\)\s+in\s+(.*)$/

export function needLoop ({ attributes }) {
  return LOOP_ATTRIBUTE in attributes
}

export default class RenderLoop {
  constructor (template, scope) {
    const match = digestData(template, LOOP_ATTRIBUTE).match(SIMPLE_LOOP_REGEX)

    this.parent = template.parentNode

    this.template = template
    this.scope = scope

    this.key = match[1]
    this.cache = new Map()

    this.getter = compileGetter(match[2])

    // Since `template` is just a template
    template.remove()
  }

  render (state) {
    // Shallow copy
    const shadow = Object.assign({}, state)

    const collection = this.getter(state)
    const keys = Object.keys(collection)

    // TODO: Make a more complex child diffing
    // https://jsperf.com/innerhtml-vs-removechild
    this.parent.innerHTML = ''

    // Only support Arrays for now
    for (const key of keys) {
      shadow[this.key] = collection[key]

      // Perform a simple render recycling
      let renderer = this.cache.get(key)

      if (!renderer) {
        renderer = new RenderElement(this.template.cloneNode(true), this.scope)
        this.cache.set(key, renderer)
      }

      this.parent.appendChild(renderer.element)
      renderer.render(shadow)
    }
  }
}
