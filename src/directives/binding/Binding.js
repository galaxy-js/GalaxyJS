import nextTick from 'next-tick'

import config from '../../config.js'

import BaseRenderer from '../../renderers/Base.js'

import { differ } from '../../utils/generic.js'

const BIND_TOKEN = ':'
const BIND_ONE_TIME_TOKEN = BIND_TOKEN.repeat(2)

/**
 * Directive for bindings:
 *
 *   1. :attribute
 *   2. ::attribute (one time)
 */
export default class BindingDirective extends BaseRenderer {
  constructor (attribute, context) {
    let oneTime = attribute.name.startsWith(BIND_ONE_TIME_TOKEN)

    super(
      BindingDirective.getObserved(attribute, oneTime),

      context, attribute.value
    )

    /**
     * Specific binding attributes
     */
    this.oneTime = oneTime
    this.owner = this.target.ownerElement
    this.name = this.target.name

    if (oneTime) {
      const patch = this.patch

      this.patch = value => {
        const { bindings } = context

        patch.call(this, value)

        // Schedule remove to queue end
        nextTick(() => {
          bindings.splice(bindings.indexOf(this), 1)
        })
      }
    }
  }

  static is ({ name }) {
    return name.startsWith(BIND_TOKEN)
  }

  static getObserved ({ name, ownerElement }, oneTime) {
    const normalized = name.slice(oneTime ? 2 : 1)

    let observed = ownerElement.getAttributeNode(normalized)

    if (!config.debug) ownerElement.removeAttribute(name)

    if (!observed) {
      observed = document.createAttribute(normalized)
      ownerElement.setAttributeNode(observed)
    }

    return observed
  }

  patch (attribute, value) {
    if (typeof value === 'boolean') {
      this.owner[`${value ? 'set' : 'remove'}AttributeNode`](attribute)
    } else if (differ(attribute, value)) {
      attribute.value = value
    }
  }
}
