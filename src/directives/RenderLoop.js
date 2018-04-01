import RenderElement from '../core/RenderElement.js'

import Tracker from './loop/Tracker.js'

import { digestData } from '../utils/generic.js'
import { compileNestedGetter, createAnchor, newIsolated } from '../utils/evaluation.js'
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

export function needLoop ({ attributes }) {
  return LOOP_ATTRIBUTE in attributes
}

export default class RenderLoop {
  constructor (template, scope, isolated) {
    this.template = template
    this.scope = scope

    // Inherit isolated scope
    this.isolated = isolated

    this.renders = []

    const { groups } = digestData(template, LOOP_ATTRIBUTE).match(LOOP_REGEX)

    this.keyName = groups.key || LOOP_KEY_NAME
    this.valueName = groups.value

    this.getter = compileNestedGetter(groups.expression)

    this.startAnchor = createAnchor(`start for: ${groups.expression}`)
    this.endAnchor = createAnchor(`end for: ${groups.expression}`)

    const parent =
    this.parent = template.parentNode

    // Remove `template` since is just a template
    parent.replaceChild(this.startAnchor, template)
    parent.insertBefore(this.endAnchor, this.startAnchor.nextSibling)
  }

  render () {
    let index = 0

    const collection = this.getter(this.scope.state, this.isolated)
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

          render.isolated[LOOP_INDEX] = index
          render.isolated[this.keyName] = key

          this.parent.replaceChild(render.element, toRender.element)
          this.parent.insertBefore(toRender.element, fromNext)
        }

      // --> Adding
      } else {
        render = new RenderElement(this.template.cloneNode(true), this.scope,
          newIsolated(this.isolated, {
            [LOOP_INDEX]: index,
            [this.keyName]: key,
            [this.valueName]: value
          })
        )

        this.parent.insertBefore(render.element, this.endAnchor)
      }

      // Push render on to the new queue
      index = renders.push(render)

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
