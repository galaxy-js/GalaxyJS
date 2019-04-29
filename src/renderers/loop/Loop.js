import config from '../../config.js'

import ItemRenderer from './Item.js'

import GalaxyError from '../../errors/GalaxyError.js'

import { getAttr, createAnchor } from '../../utils/generic.js'
import { isNumber, isArray, isArrayLike, isString, isSet, isMap, isObject } from '../../utils/type-check.js'

const LOOP_DIRECTIVE = '*for'

/**
 * Capture:
 *
 *  (<value>[, <key>[, <index>]]) in/of <expression>
 *
 *  - value: A value of the array or object
 *  - key: A key of the array or object
 *  - index: An index of the array or object
 *  - expression: Can be any JavaScript expression
 *
 *  Note: Parens can be omitted.
 */
const LOOP_REGEX = /^\(?(?<value>\w+)(?:\s*,\s*(?<key>\w+)(?:\s*,\s*(?<index>\w+))?)?\)?\s+(?:in|of)\s+(?<expression>.+)$/

export default class LoopRenderer {
  constructor (template, renderer) {
    this.template = template
    this.renderer = renderer

    this.items = []

    const expression = getAttr(template, LOOP_DIRECTIVE)
    const { groups } = expression.match(LOOP_REGEX)

    this.keyName = groups.key
    this.indexName = groups.index
    this.valueName = groups.value

    this.startAnchor = createAnchor(`start for: ${expression}`)
    this.endAnchor = createAnchor(`end for: ${expression}`)

    this.getter = renderer.scope.$compiler.compileExpression(groups.expression)

    // Replace template with an anchor
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

  _renderItem ($value, $key, $index) {
    let item = this.items[$index]

    // Fill item isolated scope
    const isolated = {
      $index,
      $key,

      // User-defined locals
      [this.keyName]: $key,
      [this.indexName]: $index,
      [this.valueName]: $value
    }

    if (!item) {
      item = new ItemRenderer(this.template, this.renderer, isolated)

      // Insert before end anchor
      item.insert(this.endAnchor, 'enter')
    } else {
      const newKey = item.by(isolated)

      if (item.key/* oldKey */ !== newKey) {
        let fromIndex

        const newItem = this.items.find((item, index) => item.key === newKey && (fromIndex = index))
        const from = newItem.next

        // Swap DOM elements
        newItem.insert(item.next, 'move')
        item.insert(from)

        // Swap items
        this.items[fromIndex] = item
        this.items[$index] = newItem

        item = newItem
      }

      item.update(isolated)
    }

    // Render item with new isolated scope
    item.render()

    return item
  }

  render () {
    const items = []
    const iterable = this.getter(this.renderer.isolated)

    // 1. Adding and patching DOM elements
    if (isNumber(iterable)) {
      for (let i = 0; i < iterable; i++) {
        items.push(this._renderItem(i + 1, i, i))
      }
    } else if (isArray(iterable) || isArrayLike(iterable) || isString(iterable)) {
      const { length } = iterable

      for (let i = 0; i < length; i++) {
        items.push(this._renderItem(iterable[i], i, i))
      }
    } else if (isSet(iterable) || isMap(iterable)) {
      let i = 0

      iterable.forEach((value, key) => {
        items.push(this._renderItem(value, key, i++))
      })
    } else if (iterable[Symbol.iterator]) {
      let i = 0
      let result

      const iterator = iterable[Symbol.iterator]()

      while (!(result = iterator.next()).done) {
        items.push(this._renderItem(result.value, null, i++))
      }
    } else if (isObject(iterable)) {
      Object.keys(iterable).forEach((key, index) => {
        items.push(this._renderItem(iterable[key], key, index))
      })
    } else if (iterable != null) {
      throw new GalaxyError(
        'Invalid iterable value in *for directive. ' +
        'Expecting value of type number, string, array(-like), object, iterable, Map or Set ' +
        `got '${typeof iterable}'`
      )
    }

    // 2. Remove non-patched DOM elements
    for (const item of this.items) {
      if (item.updated) {
        item.updated = false
      } else {
        item.remove()
      }
    }

    this.items = items
  }
}
