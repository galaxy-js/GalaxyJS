import config from '../config.js'

import { compileNestedGetter, diff } from '../utils/evaluation.js'

const BIND_TOKEN = ':'

export function needBinding ({ name }) {
  return name.startsWith(BIND_TOKEN)
}

export default class RenderBinding {
  constructor (attribute, scope, isolated) {
    this.attribute = RenderBinding.getObserved(attribute)
    this.scope = scope

    // Inherit isolated scope
    this.isolated = isolated

    this.expression = attribute.value

    this.getter = compileNestedGetter(this.expression)
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

  render () {
    const value = this.getter(this.scope.state, this.isolated)

    if (diff(this.attribute, value)) {
      this.attribute.value = value
    }
  }
}
