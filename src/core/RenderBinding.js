import config from '../config.js'

import { compileNestedGetter, diff } from '../utils/evaluation.js'

const BIND_TOKEN = ':'

export function needBinding ({ name }) {
  return name.startsWith(BIND_TOKEN)
}

export default class RenderBinding {
  constructor (attribute) {
    this.attribute = RenderBinding.getObserved(attribute)

    this.getter = compileNestedGetter(attribute.value)
  }

  static getObserved (attribute) {
    const { name } = attribute
    const { attributes } = attribute.ownerElement

    const observed = document.createAttribute(name.slice(1))
    observed.value = attribute.value

    attributes.setNamedItem(observed)

    if (!config.debug) {
      attributes.removeNamedItem(name)
    }

    return observed
  }

  render (state, isolated) {
    const value = this.getter(state, isolated)

    if (diff(this.attribute, value)) {
      this.attribute.value = value
    }
  }
}
