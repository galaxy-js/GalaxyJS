import { GalaxyElement, html } from '../dist/galaxy.js'

export default class TestProps extends GalaxyElement {
  static get template () {
    return html`
      <slot name="title"></slot>

      <h2 :style="{ color: color }">
        {{ props.string }}
      </h2>

      <h2>Selected fruit: {{ fruit }}</h2>

      <label *for="_fruit in fruits">
        {{ _fruit }}
        <input type="radio" :value="_fruit" *bind="fruit" @change="#showFruit()">
      </label>

      <h2>Selected sports: {{ selectedSports.join(',') }}</h2>

      <select multiple *bind="selectedSports" @change="#showSport()">
        <option value="" disabled>Sport</option>
        <option *for="_sport in sports" :value="_sport">{{ _sport.toUpperCase() }}</option>
      </select>
    `
  }

  static get properties () {
    return {
      object: { default: true },
      string: 'Hello World!!!'
    }
  }

  constructor () {
    super()

    this.colors = ['tomato', 'steelblue']
    this.colorIndex = 0

    this.state = {
      color: this.colors[this.colorIndex],
      fruits: ['apple', 'strawberry', 'lemon'],
      fruit: null,
      sports: ['football', 'soccer', 'basketball', 'tennis'],
      selectedSports: ['tennis']
    }
  }

  onCreated () {
    console.log(this.props.object)
    console.log(this.$parent)

    setTimeout(() => {
      this.props.object.push('a')
    }, 2000)

    setInterval(() => {
      this.state.color = this.colors[this.colorIndex = (this.colorIndex + 1) % 2]
    }, 1000)
  }

  onAttached () {
    console.log('Attached')
  }

  showFruit ({ fruit }) {
    console.log('Fruit:', fruit)
  }

  showSport ({ selectedSports }) {
    console.log('Sports:', selectedSports)
  }
}
