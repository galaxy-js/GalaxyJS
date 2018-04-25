import config from '../config.js'

import nextTick from 'https://cdn.jsdelivr.net/gh/LosMaquios/next-tick@v0.1.0/index.js'
import { compileScopedGetter } from '../compiler/index.js'
import { differ } from '../utils/generic.js'

const BIND_TOKEN = ':'
const BIND_ONE_TIME_TOKEN = BIND_TOKEN.repeat(2)

export default class RenderBinding {
  constructor (attribute, context) {
    this.context = context

    this.oneTime = attribute.name.startsWith(BIND_ONE_TIME_TOKEN)

    this.attribute = this._getObserved(attribute)

    this.expression = attribute.value

    this.getter = compileScopedGetter(this.expression, context)

    // Attribute raw value (without any conversion) and holding reference
    this.value = null

    if (this.oneTime) {
      const render = this.render

      this.render = () => {
        const { bindings } = context

        // Schedule remove to queue end
        nextTick(() => {
          bindings.splice(bindings.indexOf(this), 1)
        })

        render.call(this)
      }
    }
  }

  static is ({ name }) {
    return name.startsWith(BIND_TOKEN)
  }

  _getObserved (attribute) {
    const { name } = attribute
    const { attributes } = attribute.ownerElement

    const normalizedName = name.slice(this.oneTime ? 2 : 1)

    let observed = attributes.getNamedItem(normalizedName)

    if (observed) return observed

    observed = document.createAttribute(normalizedName)
    attributes.setNamedItem(observed)

    if (!config.debug) {
      attributes.removeNamedItem(name)
    }

    return observed
  }

  render () {
    const value = this.value = this.getter()

    if (differ(this.attribute, value)) {
      this.attribute.value = value
    }
  }
}
