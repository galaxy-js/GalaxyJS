import { isObject, isProxy } from './utils.js'

const { hasOwnProperty } = Object.prototype

export default class Observer {
  constructor () {
    this.subs = []
  }

  _dispatcher (...args) {
    for (const fn of this.subs) {
      fn(...args)
    }

    return true
  }

  observe (data) {
    const proxy = new Proxy(data, {
      set: this._dispatcher.bind(this)
    })

    for (const property in data) {
      if (hasOwnProperty.call(data, property)) {
        const value = data[property]

        if (isObject(value)) {
          data[property] = this.observe(value)
        }
      }
    }

    return proxy
  }

  sub (fn) {
    this.subs.push(fn)
  }

  unsub (fn) {
    this.subs.splice(this.subs.indexOf(fn), 1)
  }
}