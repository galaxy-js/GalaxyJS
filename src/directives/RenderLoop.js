import RenderElement from '../core/RenderElement.js'

import Tracker from './loop/Tracker.js'

import { digestData } from '../utils/generic.js'
import { compileNestedGetter, createAnchor } from '../utils/evaluation.js'
import { isDefined } from '../utils/type-check.js'

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

const LOOP_INDEX = '$index'
const LOOP_KEY_NAME = '$key'

export function needLoop ({ attributes }) {
  return LOOP_ATTRIBUTE in attributes
}

export default class RenderLoop {
  constructor (template, scope) {
    this.template = template
    this.scope = scope

    const [, value, keyOrIndex, expression] = digestData(template, LOOP_ATTRIBUTE).match(LOOP_REGEX)

    this.keyName = keyOrIndex || LOOP_KEY_NAME
    this.valueName = value

    this.renders = []

    this.getter = compileNestedGetter(expression)

    this.startAnchor = createAnchor(`Start gFor: ${expression}`)
    this.endAnchor = createAnchor(`End gFor: ${expression}`)

    const parent = 
    this.parent = template.parentNode

    // Remove `template` since is just a template
    parent.replaceChild(this.startAnchor, template)
    parent.insertBefore(this.endAnchor, this.startAnchor.nextSibling)
  }

  same (render, isolated) {
    return render.isolated[this.valueName] === isolated
  }

  getMap (start, end) {
    const map = new WeakMap()

    for (let i = start; i < end; i++) {
      const render = this.renders[i]
      if (render) map.set(render, i)
    }

    return map
  }

  attach (collection, { track, startIndex, endIndex }, state) {
    for (let i = startIndex; i <= endIndex; i++) {
      const key = track[i]

      if (isDefined(key)) {
        const element = this.template.cloneNode(true)
  
        const renderer = new RenderElement(element, this.scope, {
          [LOOP_INDEX]: i,
          [this.keyName]: key,
          [this.valueName]: collection[key]
        })

        this.parent.insertBefore(element, this.endAnchor)

        renderer.render(state)
      }
    }
  }

  purge ({ track, startIndex, endIndex }) {
    for (let i = startIndex; i < endIndex; i++) {
      const renderer = track[i]
      if (renderer) renderer.element.remove()
    }
  }

  render (state, isolated) {
    let index = 0

    const collection = this.getter(state, isolated)
    const keys = Object.keys(collection)

    const rendersTracker = new Tracker(this.renders)
    const keysTracker = new Tracker(keys)

    const getIsolated = key => ({
      [LOOP_INDEX]: index,
      [this.keyName]: key,
      [this.valueName]: collection[key]
    })

    const renderIsolated = (renderer, key) => {
      // Merge isolated
      Object.assign(renderer.isolated, getIsolated(key))

      // Go to rendering phase
      renderer.render(state)
    }

    let indexMap

    while (
      rendersTracker.startIndex <= rendersTracker.endIndex &&
      keysTracker.startIndex <= keysTracker.endIndex
    ) {
      if (!isDefined(rendersTracker.start)) {
        rendersTracker.nextStart()
      } else if (!isDefined(rendersTracker.end)) {
        rendersTracker.nextEnd()

        // Renders: [-> A, B, C]
        // Keys:    [-> 1, 2, 3]
      } else if (this.same(rendersTracker.start, keysTracker.start)) {
        renderIsolated(rendersTracker.start, keysTracker.start)

        rendersTracker.nextStart()
        keysTracker.nextStart()

      // Renders: [A, B, C <-]
      // Keys:    [1, 2, 3 <-]
      } else if (this.same(rendersTracker.end, keysTracker.end)) {
        renderIsolated(rendersTracker.end, keysTracker.end)

        rendersTracker.nextEnd()
        keysTracker.nextEnd()

      // Renders: [-> A, B, C]
      // Keys:    [1, 2, 3 <-]
      } else if (this.same(rendersTracker.start, keysTracker.end)) {
        this.parent.insertBefore(rendersTracker.start.element, rendersTracker.end.element.nextSibling)

        renderIsolated(renderIsolated.start, keysTracker.end)

        rendersTracker.nextStart()
        keysTracker.nextEnd()

      // Renders: [A, B, C <-]
      // Keys:    [-> 1, 2, 3]
      } else if (this.same(rendersTracker.end, keysTracker.start)) {
        this.parent.insertBefore(rendersTracker.end.element, rendersTracker.start.element)

        renderIsolated(renderIsolated.end, keysTracker.start)

        rendersTracker.nextEnd()
        keysTracker.nextStart()
      } else {
        if (!isDefined(indexMap)) indexMap = this.getMap()

        const key = keysTracker.start
        const actualIndex = indexMap.get(collection[key])

        let renderer

        if (!isDefined(actualIndex)) {
          renderer = new RenderElement(this.template.cloneNode(true), this.scope, isolated)
        } else {
          renderer = this.renders[actualIndex]
          this.renders[actualIndex] = undefined
        }

        this.parent.insertBefore(renderer.element, rendersTracker.start.element)
        renderIsolated(renderer, key)

        keysTracker.nextStart()
      }
    }

    if (rendersTracker.startIndex > rendersTracker.endIndex) {
      this.attach(collection, keysTracker, state)
    } else {
      this.purge(rendersTracker)
    }
  }
}