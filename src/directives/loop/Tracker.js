export default class Tracker {
  constructor (track, cursor) {
    this.track = Tracker.toDescriptors(track)
    this.cursor = cursor
  }

  static toDescriptors (track) {
    return track.map(render => ({ render, removed: false }))
  }

  index (value) {
    for (let i = 0; i < this.track.length; ++i) {
      const { removed, render } = this.track[i]

      if (!removed && render.isolated[this.cursor] === value) {
        return i
      }
    }

    return -1
  }

  swap (from, to) {
    const toDescriptor = this.track[to]
    this.track[to] = this.track[from]
    this.track[from] = toDescriptor

    return toDescriptor.render
  }

  exclude (index) {
    const descriptor = this.track[index]
    descriptor.removed = true

    return descriptor.render
  }
}
