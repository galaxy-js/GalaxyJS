import ItemRenderer from './Item.js'

import { compileScopedGetter } from '../../../compiler/index.js'
import { getAttr, createAnchor, newIsolated } from '../../../utils/generic.js'
import { isDefined } from '../../../utils/type-check.js'

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
 *  2. With key
 *
 *   [item], [key] in [expression]
 *   [item], [key], [index] in [expression]
 *
 *  3. With index
 *
 *   ([item], [key]) in [expression]
 *   ([item], [key], [index]) in [expression]
 */
const LOOP_REGEX = /^\(?(?<value>\w+)(?:\s*,\s*(?<key>\w+)(?:\s*,\s*(?<index>\w+))?)?\)?\s+in\s+(?<expression>.+)$/

export default class LoopRenderer {
  constructor (template, context) {
    this.template = template
    this.context = context

    this.items = []

    const { groups } = getAttr(template, LOOP_ATTRIBUTE).match(LOOP_REGEX)

    this.keyName = groups.key
    this.indexName = groups.index
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

    const items = []

    // TODO: Add sort of track-by (maybe a key attribute)

    // 1. Adding, updating
    keys.forEach(($key, $index) => {
      const value = collection[$key]

      let item = this.items[$index]

      const isolated = {
        $index,
        $key,

        // User-defined locals
        [this.keyName]: $key,
        [this.indexName]: $index,
        [this.valueName]: value
      }

      if (item) {
        item.update(isolated)
      } else {
        item = new ItemRenderer(this.template, this.context, isolated)

        // Insert before end anchor
        item.insert(this.endAnchor)
      }

      // Push render on to the new queue
      items.push(item)

      item.render()
    })

    // 2. Removing
    for (const item of this.items) {
      if (item.reused) {
        // Enable recycling again
        item.reused = false
      } else {
        item.remove()
      }
    }

    this.items = items
  }
}
