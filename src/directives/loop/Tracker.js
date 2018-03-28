export default class Tracker {
  constructor (track, valueName) {
    this.track = track.slice()
    this.valueName = valueName
  }

  get size () {
    return this.track.length
  }

  index (value) {
    for (let i = 0; i < this.track.length; ++i) {
      const render = this.track[i]

      if (render && render.isolated[this.valueName] === value) {
        return i
      }
    }

    return -1
  }

  get (index) {
    return this.track[index]
  }

  each (fn) {
    this.track.forEach(fn)
  }

  remove (index) {
    const value = this.track[index]
    this.track[index] = undefined

    return value
  }
}
