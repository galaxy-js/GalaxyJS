export default class Tracker {
  constructor (track) {
    this.track = track

    this.startIndex = 0
    this.endIndex = track.length - 1

    this.start = track[this.startIndex]
    this.end = track[this.endIndex]
  }

  nextStart () {
    this.start = this.track[++this.startIndex]
  }

  nextEnd () {
    this.end = this.track[--this.endIndex]
  }
}
