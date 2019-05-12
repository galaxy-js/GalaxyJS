import * as Galaxy from '../dist/galaxy.esm.js'

import TodoApp from './todo-app/definition.js'

class SayHelloPlugin extends Galaxy.GalaxyPlugin {
  static init (config) {
    console.log('Hello on init with config:', config)
  }

  static install (GalaxyElement) {
    console.log('Installing on:', GalaxyElement.is)
  }
}

const SomeGlobalMixin = {
  state () {
    return {
      __global_var__: 'Hello World!'
    }
  },
  logHook (name) {
    console.log(`Called ${name} hook from global mixin in element <${this.$name}>`)
  },
  onCreated () {
    this.logHook('created')
  },
  onAttached () {
    this.logHook('attached')
  },
  onDetached () {
    this.logHook('detached')
  },
  onAttribute () {
    this.logHook('attribute')
  }
}

Galaxy.setup({

  root: TodoApp,

  // Ready for prod
  debug: true,

  plugins: [
    SayHelloPlugin
  ],

  mixins: [
    SomeGlobalMixin
  ],

  filters: {
    reverse (value, ...args) {
      return value.split('').reverse().join('')
    }
  }
})
