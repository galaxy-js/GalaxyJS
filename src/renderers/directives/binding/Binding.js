import config from '../../../config.js'

import BaseRenderer from '../../Base.js'

import nextTick from 'https://cdn.jsdelivr.net/gh/LosMaquios/next-tick@v0.1.0/index.js'
import { compileScopedGetter } from '../../../compiler/index.js'
import { differ } from '../../../utils/generic.js'

const BIND_TOKEN = ':'
const BIND_ONE_TIME_TOKEN = BIND_TOKEN.repeat(2)

/**
 * Renderer for bindings:
 *
 *   1. :attribute
 *   2. ::attribute (one time)
 */
export default class BindingRenderer extends BaseRenderer {
  constructor (attribute, context) {
    let oneTime = attribute.name.startsWith(BIND_ONE_TIME_TOKEN)

    super(
      BindingRenderer.getObserved(attribute, oneTime),

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

  static getObserved (attribute, oneTime) {
    const { name } = attribute
    const { attributes } = attribute.ownerElement

    const normalizedName = name.slice(oneTime ? 2 : 1)

    let observed = attributes.getNamedItem(normalizedName)

    if (!config.debug) attributes.removeNamedItem(name)

    if (!observed) {
      observed = document.createAttribute(normalizedName)
      attributes.setNamedItem(observed)
    }

    return observed
  }

  patch (attribute, value) {
    if (differ(attribute, value)) {
      attribute.value = value
    }
  }
}
