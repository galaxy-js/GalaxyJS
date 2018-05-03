/**
 * Better `EventTarget` implementation
 */
class GalaxyChannel {
  constructor () {
    this.ports = Object.create(null)
  }

  _getListeners (port) {
    return this.ports[port] || []
  }

  on (port, callback) {
    (this.ports[port] = this._getListeners(port)).push(callback)
  }

  off (port, callback) {
    const alive = this._getListeners(port).filter(_ => _ !== callback)

    if (alive.length) {
      this.ports[port] = alive
    } else {
      delete this.ports[port]
    }
  }

  emit (port, payload) {
    this._getListeners(port).forEach(callback => callback(payload))
  }
}

export const channel = new GalaxyChannel()
