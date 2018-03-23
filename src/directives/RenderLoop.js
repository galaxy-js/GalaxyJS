import RenderElement from '../core/RenderElement.js'

import { digestData } from '../utils/generic.js'
import { compileNestedGetter } from '../utils/evaluation.js'

// Note: to maintain consistence avoid `of` reserved word on iterators.

// TODO: Make directive debuggable

const LOOP_ATTRIBUTE = 'g-for'

/**
 * Captures:
 *
 *  1. Simple
 *
 *   [item] in [expression]
 *   ([item]) in [expression]
 *
 *  2. Complex
 *
 *   [item], [key|index] in [expression]
 *   ([item], [key|index]) in [expression]
 */
const LOOP_REGEX = /^\(?(\w+)(?:\s*,\s*(\w+))?\)?\s+in\s+(.+)$/

export function needLoop ({ attributes }) {
  return LOOP_ATTRIBUTE in attributes
}

export default class RenderLoop {
  constructor (template, scope) {
    this.parent = template.parentNode

    this.template = template
    this.scope = scope

    const [, value, keyOrIndex, expression] = digestData(template, LOOP_ATTRIBUTE).match(LOOP_REGEX)

    this.keyName = keyOrIndex
    this.valueName = value

    this.tracker = []

    this.getter = compileNestedGetter(expression)

    // Since `template` is just a template
    template.remove()
  }

  purge (length) {
    let residual = this.tracker.length - length

    if (residual > 0) {
      while (residual--) {
        const renderer = this.tracker.pop()

        // Unmount element
        renderer.element.remove()
      }
    }
  }

  render (state, isolated) {
    let index = 0

    const collection = this.getter(state, isolated)
    const keys = Object.keys(collection)

    // TODO: Maybe check arrayLike?
    const keyName = this.keyName || (Array.isArray(collection) ? '$index' : '$key')

    // Only support Arrays for now
    for (const key of keys) {
      // Isolated scope is interpreted as a child scope that override
      // properties from its parent (the element itself)
      const isolated = {
        [keyName]: key,
        [this.valueName]: collection[key]
      }

      let renderer = this.tracker[index++]

      if (renderer) {
        // TODO: Check possible isolated collisions
        // Update isolated scope
        Object.assign(renderer.isolated, isolated)
      } else {
        const element = this.template.cloneNode(true)

        renderer = new RenderElement(element, this.scope, isolated)

        this.parent.appendChild(element)
        this.tracker.push(renderer)
      }

      renderer.render(state)
    }

    this.purge(keys.length)
  }
}
