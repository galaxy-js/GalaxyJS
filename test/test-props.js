import { GalaxyElement, html } from '../src/index.js'

export default class TestProps extends GalaxyElement {
  static get is () {
    return 'test-props'
  }

  static get template () {
    return html`
      <h2 :style="{ color: color }">
        {{ props.string }}
      </h2>
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
    this.state.color = this.colors[this.colorIndex]
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
    this.$channel.emit('test-props', { created: true })
    console.log('Attached')
  }
}
