import config from '../../../config.js'

import BaseRenderer from '../../Base.js'
import ItemRenderer from './Item.js'

import { getAttr, createAnchor, newIsolated } from '../../../utils/generic.js'
import { isDefined } from '../../../utils/type-check.js'

// Note: to maintain consistence avoid `of` reserved word on iterators.

// TODO: Add anchor delimiters

const LOOP_DIRECTIVE = '*for'

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

export default class LoopRenderer extends BaseRenderer {
  constructor (template, context) {
    const expression = getAttr(template, LOOP_DIRECTIVE)
    const { groups } = expression.match(LOOP_REGEX)

    super(template, context, groups.expression)

    this.items = []
    this.values = new Map()

    this.keyName = groups.key
    this.indexName = groups.index
    this.valueName = groups.value

    this.startAnchor = createAnchor(`start for: ${groups.expression}`)
    this.endAnchor = createAnchor(`end for: ${groups.expression}`)

    const parent = template.parentNode

    // Remove `template` since is just a template
    parent.replaceChild(this.startAnchor, template)
    parent.insertBefore(this.endAnchor, this.startAnchor.nextSibling)

    if (!template.hasAttribute(':by')) {
      if (config.debug) {
        console.warn(
          'The element with the loop expression `' + expression + '` ' +
          'doesn\'t have a `by` binding, defaulting to `$index` tracking.'
        )
      }

      template.setAttribute(':by', '$index')
    }
  }

  static is ({ attributes }) {
    return LOOP_DIRECTIVE in attributes
  }

  patch (template, collection) {
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
        const oldKey = item.key
        const newKey = item.by(isolated)

        if (oldKey !== newKey) {
          const newItem = this.values.get(newKey)
          newItem.insert(item.renderer.element.nextSibling)
          item = newItem
        }

        item.update(isolated)
      } else {
        item = new ItemRenderer(template, this.context, isolated)

        // Insert before end anchor
        item.insert(this.endAnchor)

        this.values.set(item.key.value, item)
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
        this.values.delete(item.key.value)
        item.remove()
      }
    }

    this.items = items
  }
}
