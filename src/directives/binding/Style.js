import BindingDirective from './Binding.js'

import { isObject } from '../../utils/type-check.js'

const UNIT_SEPARATOR = '.'

// TODO: Support single-styleb binding eg. :style.height.px="height", without unit :style.display="'block'"

export default class StyleDirective extends BindingDirective {
  static get is () {
    return ':style'
  }

  static parseRule (rule) {
    const segments = rule.split(UNIT_SEPARATOR)

    return {
      prop: segments[0],
      unit: segments[1]
    }
  }

  init () {

    // Cached styles
    this.styles = {}
  }

  render () {
    const styles = this.$getter()

    // Fallback to normal styles patching
    if (!isObject(styles)) return super.render()

    const $styles = this.$element.attributeStyleMap

    // Remove actual props
    for (const rule in this.styles) {
      if (!styles.hasOwnProperty(rule)) {
        $styles.delete(StyleDirective.parseRule(rule).prop)
      }
    }

    // Add/set props
    for (const rule in styles) {
      const value = styles[rule]

      if (this.styles[rule] !== value) {
        const { prop, unit } = StyleDirective.parseRule(rule)
        $styles[value ? 'set' : 'delete'](prop, unit ? CSS[unit](value) : value)
      }
    }

    this.styles = Object.assign({}, styles)
  }
}
