import config from '../config.js'

import nextTick from '../utils/next-tick.js'
import { compileNestedGetter, diff } from '../utils/evaluation.js'

const BIND_TOKEN = ':'
const BIND_ONE_TIME_TOKEN = BIND_TOKEN.repeat(2)

export function needBinding ({ name }) {
  return name.startsWith(BIND_TOKEN)
}

export default class RenderBinding {
  constructor (attribute, element) {
    this.oneTime = attribute.name.startsWith(BIND_ONE_TIME_TOKEN)

    this.attribute = RenderBinding.getObserved(attribute, this.oneTime)
    this.scope = element.scope

    // Inherit isolated scope
    this.isolated = element.isolated

    this.expression = attribute.value

    this.getter = compileNestedGetter(this.expression)

    if (this.oneTime) {
      const render = this.render

      this.render = () => {
        const { bindings } = element

        // Schedule remove to queue end
        nextTick(() => {
          bindings.splice(bindings.indexOf(this), 1)
        })
        
        render.call(this)
      }
    }
  }

  static getObserved (attribute, oneTime) {
    const { name } = attribute
    const { attributes } = attribute.ownerElement

    const observed = document.createAttribute(name.slice(oneTime ? 2 : 1))
    observed.value = attribute.value

    attributes.setNamedItem(observed)

    if (!config.debug) {
      attributes.removeNamedItem(name)
    }

    return observed
  }

  render () {
    const value = this.getter(this.scope.state, this.isolated)

    if (diff(this.attribute, value)) {
      this.attribute.value = value
    }
  }
}
