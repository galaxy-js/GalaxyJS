import GalaxyDirective from '../../core/GalaxyDirective.js'

export default class BindDirective extends GalaxyDirective {
  static get is () {
    return '*bind'
  }

  init () {
    this.setting = false

    // Input -> State
    const setter = this.$compiler.compileSetter(this.$value)

    this.setter = value => setter(this.$renderer.isolated, value)

    if (this.onInput) {
      this.$element.addEventListener('input', this.onInput.bind(this))
    }

    if (this.onChange) {
      this.$element.addEventListener('change', this.onChange.bind(this))
    }
  }

  /**
   * Helper to set multiple values
   *
   * @param {boolean} active
   * @param {string} value
   * @param {Array<*>} values
   *
   * @return void
   */
  static setMultiple (active, value, values) {
    const index = values.indexOf(value)

    if (active) {
      index === -1 && values.push(value)
    } else if (index > -1) {
      values.splice(index, 1)
    }
  }

  setValue (value) {
    this.setting = true
    this.setter(value)
  }

  render () {

    // Avoid re-dispatching render on updated values
    if (this.setting) {
      this.setting = false
    } else {
      this.update(this.$element, this.$getter())
    }
  }
}
