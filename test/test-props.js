import { GalaxyElement, html } from '../dist/galaxy.esm.js'

export default class TestProps extends GalaxyElement {
  static get template () {
    return html`
      <slot name="title"></slot>

      <h2 :style="{ color: color }">
        {{ string }}
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

      <div>
        <br>
        <span *if="showText" @if:enter="console.log('Enter transition:', $event)" @if:leave="console.log('Leave transition:', $event)">Some text</span>
        <br>
        <button @click="showText = !showText">Toggle text</button>
      </div>

      <input @change="#showDate()" *bind.date="date" type="date">
      <input @change="#showNumber()" *bind.number="number" type="number">

      <ul>
        <template *for="cuber of cubers" by="cuber">
          <li>----------------</li>
          <li>{{ cuber }}</li>
        </template>
      </ul>

      <template *if="showTP" @if:enter="console.log('Enter transition:', $event)" @if:leave="console.log('Leave transition:', $event)">
        <h2>Some title</h2>
        <p>Some paragraph</p>
      </template>

      <button type="button" @click="showTP = !showTP">Toggle TP</button>
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
      showTP: true,
      showText: false,
      cubers: [
        'Feliks Zemdegs',
        'Patrick Ponce',
        'Mats Valk',
        'Max Park'
      ],
      color: this.colors[this.colorIndex],
      fruits: ['apple', 'strawberry', 'lemon'],
      fruit: null,
      sports: ['football', 'soccer', 'basketball', 'tennis'],
      selectedSports: ['tennis'],
      date: new Date(),
      number: 10
    }

    setTimeout(() => {
      this.state.cubers.sort()

      console.log('Cubers:', this.state.cubers)
    }, 1000)
  }

  onCreated () {
    console.log(this.object)
    console.log(this.$parent)

    setTimeout(() => {
      this.object.push('a')
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

  showDate ({ date }) {
    console.log('Date:', date)
  }

  showNumber ({ number }) {
    console.log('Number:', number)
  }
}
