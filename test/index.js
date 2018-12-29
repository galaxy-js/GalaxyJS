import * as Galaxy from '../dist/galaxy.esm.js'

import TodoApp from './todo-app/definition.js'

class SayHelloPlugin extends Galaxy.GalaxyPlugin {
  static init (config) {
    console.log('Hello on init with config:', config)
  }

  static install (GalaxyElement) {
    console.log('Installing on:', GalaxyElement)
  }
}

Galaxy.setup({

  root: TodoApp,

  // Ready for prod
  debug: true,

  plugins: [
    SayHelloPlugin
  ],

  filters: {
    reverse (value, ...args) {
      return value.split('').reverse().join('')
    }
  }
})
