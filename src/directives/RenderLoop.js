import RenderElement from '../core/RenderElement.js'

import { digestData } from '../utils/generic.js'
import { compileNestedGetter, createAnchor } from '../utils/evaluation.js'

// Note: to maintain consistence avoid `of` reserved word on iterators.

// TODO: Add anchor delimiters

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
    this.template = template
    this.scope = scope

    const [, value, keyOrIndex, expression] = digestData(template, LOOP_ATTRIBUTE).match(LOOP_REGEX)

    this.keyName = keyOrIndex
    this.valueName = value

    this.tracker = []

    this.getter = compileNestedGetter(expression)

    this.startAnchor = createAnchor(`Start gFor: ${expression}`)
    this.endAnchor = createAnchor(`End gFor: ${expression}`)

    const parent = template.parentNode

    // Remove `template` since is just a template
    parent.replaceChild(this.startAnchor, template)
    parent.insertBefore(this.endAnchor, this.startAnchor.nextSibling)
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

    const parent = this.endAnchor.parentNode

    this.purge(keys.length)

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

        parent.insertBefore(element, this.endAnchor)
        this.tracker.push(renderer)
      }

      renderer.render(state)
    }
  }
}
