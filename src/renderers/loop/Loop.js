import config from '../../config.js'

import ItemRenderer from './Item.js'

import { compileExpression } from '../../compiler/index.js'
import { getAttr, createAnchor } from '../../utils/generic.js'

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

export default class LoopRenderer {
  constructor (template, renderer) {
    this.template = template
    this.renderer = renderer

    this.items = []
    this.values = new Map()

    const expression = getAttr(template, LOOP_DIRECTIVE)
    const { groups } = expression.match(LOOP_REGEX)

    this.keyName = groups.key
    this.indexName = groups.index
    this.valueName = groups.value

    this.startAnchor = createAnchor(`start for: ${expression}`)
    this.endAnchor = createAnchor(`end for: ${expression}`)

    this.getter = compileExpression(groups.expression)

    // Remove template with an anchor
    template.replaceWith(this.startAnchor)
    this.startAnchor.nextSibling.before(this.endAnchor)

    if (!template.hasAttribute('by')) {
      if (config.debug) {
        console.warn(
          'The element with the loop expression `' + expression + '` ' +
          'doesn\'t have a `by` attribute, fallbacking to `$index` tracking.'
        )
      }

      template.setAttribute('by', '$index')
    }
  }

  static is ({ attributes }) {
    return LOOP_DIRECTIVE in attributes
  }

  render () {
    const collection = this.getter(this.renderer.scope, this.renderer.isolated)

    const items = []
    const keys = Object.keys(collection)

    // 1. Adding, updating
    keys.forEach(($key, $index) => {
      let item = this.items[$index]

      const isolated = {
        $index,
        $key,

        // User-defined locals
        [this.keyName]: $key,
        [this.indexName]: $index,
        [this.valueName]: collection[$key]
      }

      if (!item) {
        item = new ItemRenderer(this.template, this.renderer, isolated)

        // Insert before end anchor
        item.insert(this.endAnchor)

        this.values.set(item.key, item)
      } else {
        const newKey = item.by(isolated)

        if ((item.key /* oldKey */) !== newKey) {
          const newItem = this.values.get(newKey)
          const from = newItem.next

          // Swap elements
          newItem.insert(item.next)
          item.insert(from)

          // Swap items
          this.items[this.items.indexOf(newItem)] = item
          this.items[$index] = newItem

          item = newItem
        }

        item.update(isolated)
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
