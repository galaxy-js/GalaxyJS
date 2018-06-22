import BindingRenderer from './Binding.js'

import { isObject } from '../../../utils/type-check.js'

const STYLE_REGEX = /^:{1,2}style$/
const UNIT_SEPARATOR = '.'

export default class StyleRenderer extends BindingRenderer {
  constructor (...args) {
    super(...args)

    this.styles = {}
  }

  static is ({ name }) {
    return STYLE_REGEX.test(name)
  }

  static parseRule (rule) {
    const segments = rule.split(UNIT_SEPARATOR)

    return {
      prop: segments[0],
      unit: segments[1]
    }
  }

  patch (style, styles) {
    // Fallback to normal styles patching
    if (!isObject(styles)) return super.patch(style, styles)

    const $styles = this.owner.attributeStyleMap

    // Remove actual props
    for (const rule in this.styles) {
      if (!styles.hasOwnProperty(rule)) {
        $styles.delete(StyleRenderer.parseRule(rule).prop)
      }
    }

    // Add/set props
    for (const rule in styles) {
      const value = styles[rule]

      if (this.styles[rule] !== value) {
        const { prop, unit } = StyleRenderer.parseRule(rule)
        $styles.set(prop, unit ? CSS[unit](value) : value)
      }
    }

    this.styles = Object.assign({}, styles)
  }
}
