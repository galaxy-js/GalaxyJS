export default class GalaxyError extends Error {
  constructor (message) {
    super(message)

    this.name = 'GalaxyError'
  }
}
