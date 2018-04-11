import RenderElement from '../core/RenderElement.js'

import Tracker from './loop/Tracker.js'

import { compileScopedGetter } from '../compiler/index.js'
import { digestData, createAnchor, newIsolated } from '../utils/generic.js'
import { isDefined } from '../utils/type-check.js'

// Note: to maintain consistence avoid `of` reserved word on iterators.

// TODO: Add anchor delimiters

const LOOP_ATTRIBUTE = '*for'

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
const LOOP_REGEX = /^\(?(?<value>\w+)(?:\s*,\s*(?<key>\w+))?\)?\s+in\s+(?<expression>.+)$/

const LOOP_INDEX = '$index'
const LOOP_KEY_NAME = '$key'

export default class RenderLoop {
  constructor (template, context) {
    this.template = template
    this.context = context

    this.renders = []

    const { groups } = digestData(template, LOOP_ATTRIBUTE).match(LOOP_REGEX)

    this.keyName = groups.key || LOOP_KEY_NAME
    this.valueName = groups.value

    this.getter = compileScopedGetter(groups.expression, context)

    this.startAnchor = createAnchor(`start for: ${groups.expression}`)
    this.endAnchor = createAnchor(`end for: ${groups.expression}`)

    const parent =
    this.parent = template.parentNode

    // Remove `template` since is just a template
    parent.replaceChild(this.startAnchor, template)
    parent.insertBefore(this.endAnchor, this.startAnchor.nextSibling)
  }

  static is ({ attributes }) {
    return LOOP_ATTRIBUTE in attributes
  }

  render () {
    const collection = this.getter()
    const keys = Object.keys(collection)

    const renders = []
    const tracker = new Tracker(this.renders, this.valueName)

    // TODO: Add sort of track-by
    // TODO: Check for a better diffing algorithm

    // 1. Moving & Adding
    keys.forEach((key, index) => {
      const value = collection[key]
      let renderIndex = tracker.index(value)

      let render

      if (renderIndex > -1) {
        render = tracker.exclude(renderIndex)

        // <-> Moving
        if (renderIndex !== index) {
          const toRender = tracker.swap(renderIndex, index)
          const fromNext = render.element.nextSibling

          // to -> from
          render.isolated[LOOP_INDEX] = index
          render.isolated[this.keyName] = key

          /// from -> to
          toRender.isolated[LOOP_INDEX] = renderIndex
          toRender.isolated[this.keyName] = keys[renderIndex]

          this.parent.replaceChild(render.element, toRender.element)
          this.parent.insertBefore(toRender.element, fromNext)
        }

      // --> Adding
      } else {
        render = new RenderElement(this.template.cloneNode(true), this.context.scope,

          // Isolated inheritance
          newIsolated(this.context.isolated, {
            [LOOP_INDEX]: index,
            [this.keyName]: key,
            [this.valueName]: value
          })
        )

        this.parent.insertBefore(render.element, this.endAnchor)
      }

      // Push render on to the new queue
      renders.push(render)

      render.render()
    })

    // 2. Removing
    for (const { removed, render } of tracker.track) {
      if (!removed) {
        render.element.remove()
      }
    }

    this.renders = renders
  }
}
