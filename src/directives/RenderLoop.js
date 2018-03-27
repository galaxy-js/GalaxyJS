import RenderElement from '../core/RenderElement.js'

import { digestData } from '../utils/generic.js'
import { compileNestedGetter, createAnchor } from '../utils/evaluation.js'

// Note: to maintain consistence avoid `of` reserved word on iterators.

// TODO: Add anchor delimiters

const LOOP_DIFFING_SYMBOL = Symbol('Galaxy.LoopDiffing')

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

    const parent = this.parent = template.parentNode

    // Remove `template` since is just a template
    parent.replaceChild(this.startAnchor, template)
    parent.insertBefore(this.endAnchor, this.startAnchor.nextSibling)
  }

  getIndex (reference) {
    const { length } = this.tracker

    for (let i = 0; i < length; i++) {
      const renderer = this.tracker[renderer]

      if (renderer[LOOP_DIFFING_SYMBOL] === reference) {
        return i
      }
    }

    return -1
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
      const value = collection[key]

      const isolated = {
        [keyName]: key,
        [this.valueName]: value
      }

      let renderer
      let rendererIndex = this.getIndex(value)

      if (rendererIndex > -1) {
        renderer = this.tracker[rendererIndex]

        if (rendererIndex !== index) {
          const actual = this.tracker[index]
          const before = actual.element.nextSibling

          this.tracker[rendererIndex] = actual
          this.tracker[index] = renderer

          this.parent.replaceChild(renderer.element, actual.element)
          this.parent.insertBefore()
        }

        Object.assign(renderer.isolated, isolated)
      } else {
        const element = this.template.cloneNode(true)

        renderer = new RenderElement(element, this.scope, isolated)

        parent.insertBefore(element, this.endAnchor)
        this.tracker.push(renderer)
      }

      renderer.render(state)

      index += 1
    }
  }
}
