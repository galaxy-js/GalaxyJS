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

  render () {
    const styles = this.getter()

    // Fallback to normal rendering
    if (!isObject(styles)) return super.render()

    const $styles = this.owner.style

    // Remove actual props
    for (const rule in this.styles) {
      if (!styles.hasOwnProperty(rule)) {
        $styles[rule.split(UNIT_SEPARATOR)[0]] = null
      }
    }

    // Add new props
    for (const rule in styles) {
      if (this.styles[rule] !== styles[rule]) {
        const [prop, unit] = rule.split(UNIT_SEPARATOR)
        $styles[prop] = `${styles[rule]}${unit || ''}`
      }
    }

    this.styles = Object.assign({}, styles)
  }
}
